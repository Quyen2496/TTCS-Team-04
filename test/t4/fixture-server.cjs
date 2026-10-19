"use strict";
// API fixture for FRONTEND verification only. Never used by server.js.
const express = require("express"),
  fs = require("node:fs"),
  path = require("node:path"),
  C = require("../../public/modules/bookings/js/staff-api");
function createFixture() {
  const app = express(),
    calls = [],
    state = { walkIns: [], failNext: null, delayMs: 0 };
  app.use(express.json());
  const types = [
    {
      roomTypeId: "111111111111111111111111",
      name: "Phòng đôi",
      capacity: 2,
      availableRooms: 2,
      price: 500000,
    },
    {
      roomTypeId: "222222222222222222222222",
      name: "Phòng gia đình",
      capacity: 4,
      availableRooms: 2,
      price: 800000,
    },
  ];
  state.booking = {
    _id: "333333333333333333333333",
    bookingCode: "TEST1234",
    guestName: "Khách kiểm thử",
    phone: "0912345678",
    email: "test@example.test",
    roomTypeId: types[0].roomTypeId,
    checkIn: C.today(),
    checkOut: C.add(C.today(), 2),
    guestCount: 2,
    totalAmount: 1000000,
    depositAmount: 200000,
    status: "CONFIRMED",
    changeHistory: [],
  };
  app.use("/api", async (req, res, next) => {
    calls.push({
      method: req.method,
      path: req.path,
      body: req.body,
      authorization: req.get("authorization"),
    });
    if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
    if (state.failNext && req.path.includes(state.failNext.path)) {
      const failure = state.failNext;
      state.failNext = null;
      if (failure.disconnect) return req.socket.destroy();
      if (failure.malformed) return res.status(200).send("bad-result");
      return res
        .status(failure.status || 400)
        .json({ success: false, message: failure.message || "Lỗi kiểm thử" });
    }
    next();
  });
  app.get("/api/bookings/availability", (req, res) => {
    try {
      C.criteria(
        req.query.checkIn,
        req.query.checkOut,
        Number(req.query.guestCount),
      );
      res.json({
        success: true,
        data: state.noRooms
          ? []
          : types.filter((t) => t.capacity >= Number(req.query.guestCount)),
      });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  });
  app.get("/api/bookings/lookup", (req, res) => {
    if (
      req.query.bookingCode !== state.booking.bookingCode ||
      req.query.email !== state.booking.email
    )
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy thông tin đặt phòng hợp lệ.",
        });
    res.json({ success: true, data: state.booking });
  });
  app.post("/api/bookings/quote", (req, res) => {
    const type = types.find((t) => t.roomTypeId === req.body.roomTypeId);
    if (!type)
      return res
        .status(400)
        .json({ success: false, message: "Loại phòng không tồn tại." });
    const totalNights =
        (Date.parse(req.body.checkOut) - Date.parse(req.body.checkIn)) /
        86400000,
      quantity = req.body.quantity || 1;
    res.json({
      success: true,
      data: {
        roomTypeId: type.roomTypeId,
        roomTypeName: type.name,
        pricePerNight: type.price,
        totalNights,
        quantity,
        totalAmount: type.price * totalNights * quantity,
      },
    });
  });
  app.put("/api/bookings/:id/modify", (req, res) => {
    const old = state.booking.totalAmount,
      type = types.find((t) => t.roomTypeId === req.body.newRoomTypeId);
    Object.assign(state.booking, {
      roomTypeId: type.roomTypeId,
      roomTypeName: type.name,
      checkIn: req.body.newCheckIn,
      checkOut: req.body.newCheckOut,
      totalAmount:
        (type.price *
          (Date.parse(req.body.newCheckOut) -
            Date.parse(req.body.newCheckIn))) /
        86400000,
    });
    state.booking.changeHistory.push({
      at: new Date().toISOString(),
      actorName: "Nhân viên kiểm thử",
      description: "Đổi lịch / loại phòng",
      reason: "Dữ liệu kiểm thử",
    });
    res.json({
      success: true,
      data: state.booking,
      priceDifference: state.booking.totalAmount - old,
    });
  });
  app.post("/api/bookings/walk-in", (req, res) => {
    const type = types.find((t) => t.roomTypeId === req.body.roomTypeId),
      count = state.walkIns.length + 1;
    const booking = {
      ...req.body,
      _id: count.toString(16).padStart(24, "0"),
      bookingCode: "WALK-" + count.toString(16).toUpperCase().padStart(6, "0"),
      email: req.body.email || "walkin@homestay.com",
      totalAmount:
        (type.price *
          (Date.parse(req.body.checkOut) - Date.parse(req.body.checkIn))) /
        86400000,
      status: req.body.isPaidNow ? "CONFIRMED" : "PENDING",
      depositAmount: 0,
    };
    state.walkIns.push(booking);
    res.status(201).json({ success: true, data: booking });
  });
  const root = path.resolve(__dirname, "../../public");
  app.get("/modules/bookings/staff.html", (req, res) => {
    const html = fs.readFileSync(
      path.join(root, "modules/bookings/staff.html"),
      "utf8",
    );
    res
      .type("html")
      .send(
        html
          .replace(
            '<div class="hs-layout-content staff-container">',
            '<div class="hs-layout-content staff-container"><p class="notice warning">DỮ LIỆU KIỂM THỬ FRONTEND — không kết nối MongoDB, không tạo booking thật.</p>',
          )
          .replace(
            '<script src="/js/homestay-layout.js"',
            '<script>if(!sessionStorage.getItem("authToken")&&!localStorage.getItem("authToken")){sessionStorage.setItem("authToken","t4-frontend-test-fixture");sessionStorage.setItem("authUser",JSON.stringify({username:"NhanVienTest",role:"staff"}));}</script><script src="/js/homestay-layout.js"',
          ),
      );
  });
  app.use(express.static(root));
  return { app, state, calls };
}
module.exports = { createFixture };
if (require.main === module) {
  if (process.env.T4_UI_TEST_FIXTURE !== "1") {
    console.error(
      "Chỉ chạy kiểm thử: đặt T4_UI_TEST_FIXTURE=1. Đây không phải backend thật.",
    );
    process.exitCode = 1;
  } else {
    const { app } = createFixture();
    app.listen(3002, "127.0.0.1", () =>
      console.log(
        "DỮ LIỆU KIỂM THỬ FRONTEND: http://localhost:3002/modules/bookings/staff.html — không lưu MongoDB.",
      ),
    );
  }
}
