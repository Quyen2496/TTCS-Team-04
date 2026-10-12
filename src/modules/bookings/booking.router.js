const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

feature/t3-quynh-audit-log-api
// Dán/sửa lại các router cũ của booking ở đây nếu có
// ...

router.get('/availability', bookingController.checkAvailability);
router.post('/quote', bookingController.calculateQuote);
router.post('/create', bookingController.createBooking);
router.get('/lookup', bookingController.getBookingByCodeAndEmail);
router.patch('/:bookingId/cancel', verifyToken, bookingController.cancelBooking);

// SPRINT 3: Route đổi ngày / loại phòng
router.put('/:bookingId/modify', bookingController.modifyBookingHandler);

// SPRINT 3: Route đặt phòng trực tiếp tại quầy (Walk-in)
router.post('/walk-in', bookingController.createWalkInBookingHandler);
develop

module.exports = router;
