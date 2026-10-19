const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

// Các route công khai dành cho khách hàng
router.get('/availability', bookingController.checkAvailability);
router.post('/quote', bookingController.calculateQuote);
router.post('/create', bookingController.createBooking);
router.get('/lookup', bookingController.getBookingByCodeAndEmail);

// Các route yêu cầu xác thực (Dành cho Lễ tân / Nhân viên / Quản trị)
router.patch('/:bookingId/cancel', verifyToken, bookingController.cancelBooking);

// SPRINT 3: Route đổi ngày / loại phòng
router.put('/:bookingId/modify', verifyToken, bookingController.modifyBookingHandler);

// SPRINT 3: Route đặt phòng trực tiếp tại quầy (Walk-in)
router.post('/walk-in', verifyToken, bookingController.createWalkInBookingHandler);

module.exports = router;