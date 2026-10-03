const express = require('express');
const router = express.Router();
const lookupController = require('./lookup.controller');
const { getAuditLogs } = require('./auditLog.controller');

// Route POST /api/lookup
router.post('/', lookupController.lookupBooking);

// Route GET /api/lookup/audit-logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;