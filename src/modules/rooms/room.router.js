const express = require('express');
const router = express.Router();

const roomTypeController = require('./roomType.controller');
const roomController = require('./room.controller');

// ===== LOẠI PHÒNG =====
router.get('/types', roomTypeController.getRoomTypes);
router.post('/types', roomTypeController.createRoomType);
router.put('/types/:id', roomTypeController.updateRoomType);
router.delete('/types/:id', roomTypeController.deleteRoomType);

// ===== PHÒNG VẬT LÝ =====
router.get('/', roomController.getRooms);
router.post('/', roomController.createRoom);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;