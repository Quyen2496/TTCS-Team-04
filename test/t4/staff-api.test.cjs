"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../../public/modules/bookings/js/staff-api");
const roomTypeId = "000000000000000000000001",
  bookingId = "000000000000000000000002",
  input = { checkIn: C.today(), checkOut: C.add(C.today(), 2), guestCount: 2 };
const record = {
  _id: bookingId,
  roomTypeId,
  bookingCode: "TEST1234",
  email: "test@example.test",
  checkIn: input.checkIn + "T00:00:00.000Z",
  checkOut: input.checkOut + "T00:00:00.000Z",
  guestCount: 2,
  totalAmount: 1000000,
  depositAmount: 100000,
  status: "CONFIRMED",
};
test("T4: validate calendar dates, max stay and whole guest count before requests", () => {
  assert.deepEqual(C.criteria(...Object.values(input)), input);
  for (const args of [
    ["2026-02-31", "2026-03-02", 2],
    ["2026-13-01", "2026-13-02", 2],
    [input.checkIn, input.checkIn, 2],
    [input.checkIn, C.add(input.checkIn, 31), 2],
    [input.checkIn, input.checkOut, 0],
    [input.checkIn, input.checkOut, 2.5],
  ])
    assert.throws(() => C.criteria(...args));
});
test("T4: normalize exact availability contract and reject bad capacities, counts, ids and false success", () => {
  const r = {
    roomTypeId,
    name: "Phòng gia đình",
    capacity: 4,
    availableRooms: 2,
  };
  assert.equal(C.rooms({ success: true, data: [r] }, 2).length, 1);
  assert.deepEqual(C.rooms({ success: true, data: [] }, 2), []);
  for (const row of [
    { ...r, capacity: 1 },
    { ...r, availableRooms: 0 },
    { ...r, roomTypeId: "x" },
    { ...r, name: "" },
  ])
    assert.throws(() => C.rooms({ success: true, data: [row] }, 2));
  assert.throws(() => C.rooms({ success: false, data: [r] }, 2));
});
test("T4: quotes come from the API; inconsistent totals/nights/types cannot be confirmed", () => {
  const q = {
    roomTypeId,
    roomTypeName: "Phòng đôi",
    pricePerNight: 500000,
    totalNights: 2,
    quantity: 1,
    totalAmount: 1000000,
  };
  assert.equal(
    C.quote({ success: true, data: q }, input, roomTypeId).totalAmount,
    1000000,
  );
  for (const diff of [
    { totalAmount: 999 },
    { totalNights: 1 },
    { roomTypeId: bookingId },
    { quantity: 2 },
    { pricePerNight: -1 },
  ])
    assert.throws(() =>
      C.quote({ success: true, data: { ...q, ...diff } }, input, roomTypeId),
    );
});
test("T4: booking response matches source and proposed dates; ISO dates are normalized", () => {
  assert.equal(
    C.booking(
      { success: true, data: record },
      { code: "TEST1234", email: "TEST@example.test" },
    ).checkIn,
    input.checkIn,
  );
  for (const expected of [
    { id: roomTypeId },
    { code: "OTHER123" },
    { email: "other@example.test" },
    { checkIn: input.checkOut },
  ])
    assert.throws(() => C.booking({ success: true, data: record }, expected));
  assert.throws(() =>
    C.booking({ success: true, data: { ...record, totalAmount: -1 } }),
  );
  const latest = C.booking(
    {
      success: true,
      data: {
        ...record,
        checkIn: undefined,
        checkOut: undefined,
        checkInDate: record.checkIn,
        checkOutDate: record.checkOut,
        totalDeposit: 300000,
      },
    },
    { checkIn: input.checkIn, checkOut: input.checkOut },
  );
  assert.equal(latest.depositAmount, 300000);
});
test("T4: do not change checked-in/completed/cancelled bookings; session stays with its own user/token pair", () => {
  for (const status of ["CHECKED_IN", "COMPLETED", "CANCELLED", "EXPIRED"])
    assert.equal(C.changeable({ status }), false);
  assert.equal(C.changeable({ status: "CONFIRMED" }), true);
  const store = (data) => ({ getItem: (k) => data[k] });
  assert.deepEqual(
    C.session([
      store({ authToken: "session", authUser: '{"role":"staff"}' }),
      store({ authToken: "old", authUser: '{"role":"customer"}' }),
    ]),
    { token: "session", user: { role: "staff" } },
  );
  assert.equal(C.session([store({ authToken: "session" }), store({})]), null);
});
test("T4: mutations attach real auth header/body, no automatic retry, and distinguish rejected from uncertain writes", async () => {
  let calls = 0;
  const base = {
    method: "POST",
    body: { email: "real@example.test" },
    token: "fixture-only",
  };
  const out = await C.request("/api/bookings/walk-in", {
    ...base,
    fetch: async (url, options) => {
      calls++;
      assert.equal(options.headers.Authorization, "Bearer fixture-only");
      assert.equal(JSON.parse(options.body).email, "real@example.test");
      return new Response('{"success":true,"data":{}}');
    },
  });
  assert.equal(out.success, true);
  assert.equal(calls, 1);
  for (const [status, uncertain] of [
    [400, false],
    [409, false],
    [500, true],
    [503, true],
  ])
    await assert.rejects(
      C.request("/api/bookings/walk-in", {
        ...base,
        fetch: async () =>
          new Response('{"success":false,"message":"reject"}', { status }),
      }),
      (e) => e.status === status && e.uncertain === uncertain,
    );
  await assert.rejects(
    C.request("/api/bookings/walk-in", {
      ...base,
      fetch: async () => {
        throw Error("secret-network-error");
      },
    }),
    (e) => e.uncertain && !e.message.includes("secret-network-error"),
  );
  await assert.rejects(
    C.request("/api/bookings/walk-in", {
      ...base,
      fetch: async () => new Response("invalid"),
    }),
    (e) => e.uncertain,
  );
  await assert.rejects(
    C.request("/api/bookings/walk-in", {
      ...base,
      fetch: async () => new Response("invalid", { status: 500 }),
    }),
    (e) => e.uncertain,
  );
});
test("T4: auth failure is explicit and successful HTTP containing success=false does not count as saved", async () => {
  await assert.rejects(
    C.request("/api/bookings/x/modify", {
      token: "fake",
      fetch: async () => new Response('{"success":false}', { status: 403 }),
    }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    C.request("/api/bookings/x/modify", {
      method: "PUT",
      token: "fake",
      fetch: async () => new Response('{"success":false,"message":"invalid"}'),
    }),
  );
});
