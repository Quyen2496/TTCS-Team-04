const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const invoiceController = require('./invoice.controller');

const router = express.Router();
router.get(
  '/booking/:bookingId',
  verifyToken,
  requireRoles('staff', 'admin'),
  invoiceController.getBookingInvoiceData
);

module.exports = router;
