const express = require('express');
const router = express.Router();
const lookupController = require('./lookup.controller');

// Route POST /api/lookup
router.post('/', lookupController.lookupBooking);

module.exports = router;