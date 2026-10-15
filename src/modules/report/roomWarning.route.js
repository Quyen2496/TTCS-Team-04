const express = require('express');
const router = express.Router();
const roomWarningController = require('./roomWarning.controller');

router.get('/room-shortage-warnings', roomWarningController.getRoomWarnings);

module.exports = router;