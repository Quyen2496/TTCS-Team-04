const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');

// Wrapper chống crash nếu hàm chưa định nghĩa
const safeHandler = (fn, name) => {
    if (typeof fn === 'function') return fn;
    return (req, res) => res.status(501).json({
        success: false,
        message: `Chức năng ${name} chưa được định nghĩa.`
    });
};

// 1. Xem trước bảng tính tiền trả phòng (Preview Checkout - Lát 1, 2, 3, 4)
router.get('/:bookingId/checkout-preview', safeHandler(bookingController.getCheckoutPreview, 'getCheckoutPreview'));

// 2. Xác nhận trả phòng, thu tiền & đóng booking (Confirm Checkout - Lát 5)
router.post('/:bookingId/checkout-confirm', safeHandler(bookingController.confirmCheckout, 'confirmCheckout'));

module.exports = router;