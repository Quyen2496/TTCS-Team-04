const express = require('express');
const router = express.Router();
const lookupController = require('./lookup.controller');
const { getAuditLogs } = require('./auditLog.controller');
const EmailHistory = require('./emailHistory.model');

// Route POST /api/lookup
router.post('/', lookupController.lookupBooking);

// Route GET /api/lookup/audit-logs
router.get('/audit-logs', getAuditLogs);

// Route GET /api/lookup/email-history/:bookingId (Lấy lịch sử email theo mã đặt phòng cho Frontend)
router.get('/email-history/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const history = await EmailHistory.find({ bookingId }).sort({ sentAt: -1 });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;