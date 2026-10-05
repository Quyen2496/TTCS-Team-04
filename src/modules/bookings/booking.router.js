const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');

// Route S2-07: POST /api/bookings/create
router.post('/create', bookingController.createBooking);

// Route S2-08: GET /api/bookings/lookup
router.get('/lookup', bookingController.getBookingByCodeAndEmail);

module.exports = router;