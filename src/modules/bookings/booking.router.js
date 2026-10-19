const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');

<<<<<<< HEAD
// Các route công khai dành cho khách hàng
router.get('/availability', bookingController.checkAvailability);
router.post('/quote', bookingController.calculateQuote);
router.post('/create', bookingController.createBooking);
router.get('/lookup', bookingController.getBookingByCodeAndEmail);

// Các route yêu cầu xác thực (Dành cho Lễ tân / Nhân viên / Quản trị)
router.patch('/:bookingId/cancel', verifyToken, bookingController.cancelBooking);

// SPRINT 3: Route đổi ngày / loại phòng
router.put('/:bookingId/modify', verifyToken, bookingController.modifyBookingHandler);

// SPRINT 3: Route đặt phòng trực tiếp tại quầy (Walk-in)
router.post('/walk-in', verifyToken, bookingController.createWalkInBookingHandler);

=======
 feature/t5-s4-03-invoice-pdf
// Hàm bổ trợ kiểm tra callback an toàn, tránh văng lỗi undefined

// Wrapper chống crash nếu hàm chưa định nghĩa
 develop
const safeHandler = (fn, name) => {
    if (typeof fn === 'function') return fn;
    return (req, res) => res.status(501).json({
        success: false,
        message: `Chức năng ${name} chưa được định nghĩa.`
    });
};
 feature/t5-s4-03-invoice-pdf

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


// 1. Xem trước bảng tính tiền trả phòng (Preview Checkout - Lát 1, 2, 3, 4)
router.get('/:bookingId/checkout-preview', safeHandler(bookingController.getCheckoutPreview, 'getCheckoutPreview'));
 develop

// 2. Xác nhận trả phòng, thu tiền & đóng booking (Confirm Checkout - Lát 5)
router.post('/:bookingId/checkout-confirm', safeHandler(bookingController.confirmCheckout, 'confirmCheckout'));

>>>>>>> c31a10da1ac88f3723d04fad460b8c53d5c0c7b0
module.exports = router;