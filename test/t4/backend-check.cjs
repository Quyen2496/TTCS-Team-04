"use strict";
// Read-only diagnosis of the unchanged backend. No database connection/writes.
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  checks = [];
function check(name, status, evidence) {
  checks.push({ name, status, evidence });
}
for (const file of [
  "server.js",
  "src/modules/bookings/booking.model.js",
  "src/modules/bookings/booking.router.js",
]) {
  const out = spawnSync(process.execPath, ["--check", path.join(root, file)], {
    encoding: "utf8",
  });
  check(
    "Cú pháp " + file,
    out.status === 0 ? "pass" : "blocked",
    (out.stderr || "")
      .split("\n")
      .find((line) => line.includes("SyntaxError:")) || "Cú pháp hợp lệ.",
  );
}
const router = fs.readFileSync(
    root + "/src/modules/bookings/booking.router.js",
    "utf8",
  ),
  source = fs.readFileSync(
    root + "/src/modules/bookings/booking.service.js",
    "utf8",
  ),
  model = fs.readFileSync(
    root + "/src/modules/bookings/booking.model.js",
    "utf8",
  );
const leftovers =
  (router + "\n" + model).match(/^\s*(?:feature\/[^\n]+|develop)\s*$/gm) || [];
check(
  "Dòng thừa sau xử lý merge",
  leftovers.length ? "blocked" : "pass",
  leftovers.length + " dòng nhánh nằm trong mã thực thi.",
);
(async () => {
  let controller, service, Booking, RoomType;
  try {
    controller = require(root + "/src/modules/bookings/booking.controller");
    service = require(root + "/src/modules/bookings/booking.service");
    Booking = require(root + "/src/modules/bookings/booking.model");
    RoomType = require(root + "/src/modules/rooms/roomType.model");
  } catch (e) {
    check("Nạp model/controller booking", "blocked", e.name + ": " + e.message);
  }
  if (service) {
    try {
      require(root + "/src/modules/bookings/booking.router");
      check("Router khởi động", "pass", "Nạp thành công.");
    } catch (e) {
      check("Router khởi động", "blocked", e.message);
    }
    for (const [name, value] of [
      ["Controller huỷ booking", controller.cancelBooking],
      ["Service tạo booking online", service.createBookingService],
    ])
      check(
        name,
        typeof value === "function" ? "pass" : "blocked",
        "typeof = " + typeof value,
      );
    const body = {
      guestName: "Khách kiểm thử",
      phone: "0912345678",
      roomTypeId: "invalid-id-for-no-db-test",
      checkIn: "2026-10-13",
      checkOut: "2026-10-14",
      guestCount: 1,
    };
    try {
      await service.createWalkInBooking(body);
    } catch (e) {
      check(
        "Walk-in tạo mã",
        /crypto/.test(e.message) ? "blocked" : "needs-review",
        e.message,
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto"),
      save = Booking.prototype.save,
      findType = RoomType.findById;
    try {
      Object.defineProperty(globalThis, "crypto", {
        value: crypto,
        configurable: true,
      });
      Booking.prototype.save = function () {
        return this.validate().then(() => this.toObject());
      };
      RoomType.findById = () => ({
        lean: async () => ({
          _id: "111111111111111111111111",
          name: "Loại kiểm thử",
        }),
      });
      try {
        await service.createWalkInBooking({
          ...body,
          roomTypeId: "111111111111111111111111",
        });
      } catch (e) {
        check("Walk-in payload đáp ứng schema", "blocked", e.message);
      }
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
      else delete globalThis.crypto;
      Booking.prototype.save = save;
      RoomType.findById = findType;
    }
  }
  check(
    "Service booking online trong source",
    /createBookingService/.test(source) ? "needs-review" : "blocked",
    "Controller còn gọi createBookingService; service hiện không khai báo/export hàm này.",
  );
  check(
    "Import crypto cho walk-in",
    /require\(['"](?:node:)?crypto['"]\)/.test(source)
      ? "needs-review"
      : "blocked",
    "Dùng crypto.randomBytes; service chưa import node:crypto.",
  );
  check(
    "Auth/role cho modify và walk-in",
    /router\.put\([^\n]*modify[^\n]*verifyToken/.test(router) &&
      /router\.post\([^\n]*walk-in[^\n]*verifyToken/.test(router)
      ? "needs-review"
      : "blocked",
    "Hai route mới hiện chưa gắn verifyToken/requireRoles.",
  );
  check(
    "Lịch sử thay đổi trong schema",
    /changeHistory/.test(model) ? "needs-review" : "blocked",
    "Schema hiện chưa có changeHistory; modify chỉ $set ngày/loại/tiền.",
  );
  const result = {
    base: "develop 5b04dd6; includes Phú 674f11e and later T3/T5 merges",
    mode: "Read-only runtime/source inspection; no MongoDB connection",
    checks,
    readyForRealEndToEnd: checks.every((c) => c.status === "pass"),
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.readyForRealEndToEnd ? 0 : 1;
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
