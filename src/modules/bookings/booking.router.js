const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

router.get('/availability', bookingController.checkAvailability);
router.post('/quote', bookingController.calculateQuote);
router.post('/create', bookingController.createBooking);
router.get('/lookup', bookingController.getBookingByCodeAndEmail);
router.patch('/:bookingId/cancel', verifyToken, bookingController.cancelBooking);

module.exports = router;
