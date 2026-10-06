const express = require('express');
const router = express.Router();
const roomController = require('./room.controller');
const roomImageController = require('./roomImage.controller');
const { uploadMultiple, processAndSaveImages } = require('./roomImage.middleware');

router.get('/', roomController.getRooms);

// API xử lý ảnh S2-09
router.post('/room-types/:roomTypeId/images', uploadMultiple, processAndSaveImages, roomImageController.uploadImages);
router.put('/room-types/:roomTypeId/images/reorder', roomImageController.reorderImages);
router.delete('/room-types/:roomTypeId/images/:imageId', roomImageController.deleteImage);

module.exports = router;
