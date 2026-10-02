const express = require('express');
const router = express.Router();

const roomController = require('./room.controller');

// GET /api/rooms
// GET /api/rooms?roomTypeId=...
// GET /api/rooms?floor=...
// GET /api/rooms?status=...
router.get('/', roomController.getRooms);

module.exports = router;
