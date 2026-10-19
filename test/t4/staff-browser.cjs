"use strict";
const fs = require("node:fs/promises"),
  assert = require("node:assert/strict"),
  path = require("node:path"),
  os = require("node:os");
const root = path.resolve(__dirname, "../.."),
  { createFixture } = require(root + "/test/t4/fixture-server.cjs"),
  C = require(root + "/public/modules/bookings/js/staff-api");
const { chromium } = require(
  process.env.T4_BROWSER_NODE_MODULES
    ? path.join(process.env.T4_BROWSER_NODE_MODULES, "playwright")
    : "playwright",
);
const Chrome = process.env.T4_CHROMIUM_PACKAGE
  ? require(process.env.T4_CHROMIUM_PACKAGE).default
  : null;
(async () => {
  const { app, state, calls } = createFixture(),
    server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  if (Chrome) {
    Chrome.setGraphicsMode = false;
    process.env.FONTCONFIG_PATH ||= "/etc/fonts";
  }
  const browser = await chromium.launch({
    ...(Chrome
      ? {
          executablePath: await Chrome.executablePath(),
          args: Chrome.args.filter(
            (a) =>
              !a.startsWith("--single-process") &&
              !a.startsWith("--disable-web-security"),
          ),
        }
      : {}),
    headless: true,
  });
  const checks = [],
    errors = [];
  async function pageFor(role = "staff", width = 1440) {
    const ctx = await browser.newContext({ viewport: { width, height: 950 } });
    await ctx.addInitScript((role) => {
      sessionStorage.setItem("authToken", "test-only");
      sessionStorage.setItem(
        "authUser",
        JSON.stringify({ role, username: "NhanVienTest" }),
      );
    }, role);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/modules/bookings/staff.html");
    return p;
  }
  async function idle(p) {
    await p.waitForFunction(
      () =>
        document.querySelector("#staff-workspace").getAttribute("aria-busy") !==
        "true",
    );
  }
  async function find(p) {
    await p.locator("#find-code").fill("TEST1234");
    await p.locator("#find-email").fill("test@example.test");
    await p.locator("#find-button").click();
    await p.locator("#change-section").waitFor();
    await idle(p);
  }
  async function walk(p) {
    await p.locator("#tab-walk").click();
    await p.locator("#walk-search-button").click();
    await p.locator("[data-walk-room]").first().waitFor();
    await idle(p);
    await p.locator("[data-walk-room]").first().click();
    await p.locator("#walk-message.success").waitFor();
    await idle(p);
    await p.locator("#walk-name").fill("Khách kiểm thử");
    await p.locator("#walk-phone").fill("0912345678");
    await p.locator("#walk-consent").check();
  }
  try {
    const p = await pageFor();
    await find(p);
    assert.ok(await p.locator("#change-history").innerText());
    await p.locator("#change-out").fill(C.add(C.today(), 3));
    await p.locator("#change-rooms").click();
    await idle(p);
    await p.locator("#change-type").selectOption("222222222222222222222222");
    await p.locator("#change-preview-button").click();
    await p.locator("#change-preview").waitFor();
    await idle(p);
    assert.equal(await p.locator("#change-save").isDisabled(), true);
    assert.ok(
      (await p.locator("#change-difference").innerText()).includes("1.400.000"),
    );
    await p.screenshot({
      path: path.join(os.tmpdir(), "t4-change-desktop.png"),
      fullPage: true,
    });
    checks.push(
      "Lookup and server quote show old/new price and 1,400,000 VND difference; save requires consent",
    );
    await p.locator("#change-consent").check();
    await p.locator("#change-out").fill(C.add(C.today(), 4));
    assert.equal(await p.locator("#change-preview").isVisible(), false);
    assert.equal(await p.locator("#change-save").isDisabled(), true);
    checks.push("Editing dates invalidates quote and consent");
    await p.locator("#change-preview-button").click();
    await p.locator("#change-preview").waitFor();
    await idle(p);
    await p.locator("#change-consent").check();
    state.failNext = {
      path: "/modify",
      status: 409,
      message: "Phòng đã có booking khác",
    };
    await p.locator("#change-save").click();
    await p.locator("#change-message.error").waitFor();
    await idle(p);
    assert.equal(
      await p.locator("#change-out").inputValue(),
      C.add(C.today(), 4),
    );
    assert.equal(await p.locator("#change-success").isVisible(), false);
    checks.push("409 retains proposed dates and does not report saved");
    state.delayMs = 80;
    const before = calls.filter((x) => x.path.endsWith("/modify")).length;
    await p.locator("#change-save").evaluate((b) => {
      b.click();
      b.click();
    });
    await p.locator("#change-success").waitFor();
    await idle(p);
    state.delayMs = 0;
    assert.equal(
      calls.filter((x) => x.path.endsWith("/modify")).length,
      before + 1,
    );
    assert.deepEqual(
      Object.keys(
        calls.filter((x) => x.path.endsWith("/modify")).at(-1).body,
      ).sort(),
      ["newCheckIn", "newCheckOut", "newRoomTypeId"].sort(),
    );
    assert.ok(
      (await p.locator("#change-history").innerText()).includes(
        "Nhân viên kiểm thử",
      ),
    );
    checks.push(
      "One PUT on double click; only BE-supported fields; history from API result",
    );
    await walk(p);
    state.failNext = {
      path: "/walk-in",
      status: 400,
      message: "Thông tin chưa hợp lệ",
    };
    await p.locator("#walk-create").click();
    await p.locator("#walk-message.error").waitFor();
    await idle(p);
    assert.equal(await p.locator("#walk-name").inputValue(), "Khách kiểm thử");
    assert.equal(await p.locator("#walk-success").isVisible(), false);
    checks.push("Walk-in validation error preserves guest form");
    await p.locator("#walk-paid").check();
    const count = state.walkIns.length;
    state.delayMs = 100;
    await p.locator("#walk-create").evaluate((b) => {
      b.click();
      b.click();
    });
    await p.locator("#walk-success").waitFor();
    await idle(p);
    state.delayMs = 0;
    assert.equal(state.walkIns.length, count + 1);
    const body = calls
      .filter((x) => x.path === "/bookings/walk-in")
      .at(-1).body;
    assert.ok(!Object.hasOwn(body, "email"));
    assert.equal(body.isPaidNow, true);
    assert.ok(
      (await p.locator("#walk-receipt").innerText()).includes("Đã xác nhận"),
    );
    assert.ok(
      (await p.locator("#walk-email-status").innerText()).includes(
        "không cung cấp email",
      ),
    );
    assert.ok(
      (await p.locator("#walk-checkin").getAttribute("href")).includes(
        "bookingCode=WALK-",
      ),
    );
    checks.push(
      "Walk-in no-email -> one POST and server status/code; check-in shortcut does not claim direct state transition",
    );
    await p.locator("#walk-new").click();
    await walk(p);
    await p.locator("#walk-email").fill("mail@example.test");
    state.failNext = { path: "/walk-in", status: 500 };
    const saved = state.walkIns.length;
    await p.locator("#walk-create").click();
    await p.locator("#walk-message.warning").waitFor();
    await idle(p);
    assert.equal(await p.locator("#walk-create").isDisabled(), true);
    assert.equal(await p.locator("#walk-name").inputValue(), "Khách kiểm thử");
    assert.equal(state.walkIns.length, saved);
    assert.ok(
      (await p.locator("#walk-message").innerText()).includes("đối chiếu"),
    );
    checks.push("Uncertain write freezes form and never auto-retries");
    const mobile = await pageFor("staff", 360);
    await walk(mobile);
    assert.ok(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await mobile.locator(".hs-layout-menu-toggle").click();
    await mobile.locator(".hs-layout-sidebar.is-open").waitFor();
    await mobile.keyboard.press("Escape");
    assert.equal(await mobile.locator(".hs-layout-sidebar.is-open").count(), 0);
    await mobile.screenshot({
      path: path.join(os.tmpdir(), "t4-walk-360.png"),
      fullPage: true,
    });
    checks.push(
      "360px mobile has no overflow, sidebar burger and Escape close",
    );
    const denied = await pageFor("customer", 360);
    assert.equal(await denied.locator("#auth-gate").isVisible(), true);
    assert.equal(await denied.locator("#staff-workspace").isVisible(), false);
    checks.push("Customer role cannot enter staff UI");
    assert.deepEqual(errors, []);
    const report = {
      mode: "FRONTEND API FIXTURE, NOT MONGODB END-TO-END",
      pass: true,
      checks,
      jsErrors: errors,
    };
    await fs.writeFile(
      path.join(os.tmpdir(), "t4-staff-browser-results.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
