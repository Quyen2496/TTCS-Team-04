const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const roomAssignmentController = require('./roomAssignment.controller');

// Hàm bổ trợ kiểm tra callback an toàn, tránh văng lỗi undefined
const safeHandler = (fn, name) => {
    if (typeof fn === 'function') return fn;
    return (req, res) => res.status(500).json({ 
        success: false, 
        message: `Chức năng ${name} chưa được định nghĩa trong controller.` 
    });
};

// 1. Các route booking cơ bản
if (bookingController.checkAvailability) router.get('/availability', bookingController.checkAvailability);
if (bookingController.calculateQuote) router.post('/quote', bookingController.calculateQuote);
if (bookingController.createBooking) router.post('/create', bookingController.createBooking);
if (bookingController.getBookingByCodeAndEmail) router.get('/lookup', bookingController.getBookingByCodeAndEmail);

// Route cancel (Sử dụng safeHandler để chống lỗi undefined)
router.patch('/:bookingId/cancel', safeHandler(bookingController.cancelBooking, 'cancelBooking'));

// 2. Các route Sprint 3 & Walk-in
if (bookingController.modifyBookingHandler) router.put('/:bookingId/modify', bookingController.modifyBookingHandler);
if (bookingController.createWalkInBookingHandler) router.post('/walk-in', bookingController.createWalkInBookingHandler);

// 3. [S3-03] Các route Gán phòng & Đổi phòng mới thêm
router.get('/:id/available-rooms', roomAssignmentController.getAvailableRooms);
router.post('/:id/assign-room', roomAssignmentController.assignRoom);
router.post('/:id/change-room', roomAssignmentController.changeRoom);

module.exports = router;