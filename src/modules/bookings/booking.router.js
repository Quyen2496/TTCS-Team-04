const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');

// Route S2-05: GET /api/bookings/availability (Tìm phòng trống)
router.get('/availability', bookingController.checkAvailability);

// Route S2-06: POST /api/bookings/quote (Báo giá - Server tự tính toán)
router.post('/quote', bookingController.calculateQuote);

// Route S2-07: POST /api/bookings/create (Tạo yêu cầu đặt phòng)
router.post('/create', bookingController.createBooking);

// Route S2-08: GET /api/bookings/lookup (Tra cứu thông tin đặt phòng)
router.get('/lookup', bookingController.getBookingByCodeAndEmail);

module.exports = router;