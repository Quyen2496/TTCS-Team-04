const express = require('express');
const router = express.Router();
const revenueController = require('./revenue.controller');

// Endpoint: GET /api/admin/reports/revenue
router.get('/revenue', revenueController.getRevenueReport);

module.exports = router;