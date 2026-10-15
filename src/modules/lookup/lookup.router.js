const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('./auditLog.controller');
const { lookupBooking } = require('./bookingLookup.controller');

// Route GET /api/lookup/audit-logs
router.get('/audit-logs', getAuditLogs);

// Route POST /api/lookup/booking
router.post('/booking', lookupBooking);

module.exports = router;