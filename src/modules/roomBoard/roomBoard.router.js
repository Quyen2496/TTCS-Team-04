const express = require('express');
const router = express.Router();
const roomBoardController = require('./roomBoard.controller');

// Endpoint GET sơ đồ phòng 14 ngày
router.get('/board', roomBoardController.getRoomBoard);

module.exports = router;