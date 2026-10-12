const express = require('express');
const router = express.Router();
const cancellationController = require('./cancellation.controller');
const { validateCancelBookingInput } = require('./cancellation.validation');

// GET /api/admin/bookings/:id/cancel-preview
router.get('/bookings/:id/cancel-preview', cancellationController.getCancelPreview);

// POST /api/admin/bookings/:id/cancel
router.post('/bookings/:id/cancel', validateCancelBookingInput, cancellationController.cancelBooking);

module.exports = router;