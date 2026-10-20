const express = require('express');

const router = express.Router();

const bookingController = require('./booking.controller');
const { verifyToken } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const staffOnly = requireRoles(
  'admin',
  'staff',
  'receptionist',
  'reception'
);

const safeHandler = (fn, name) => {
  if (typeof fn === 'function') return fn;

  return (req, res) =>
    res.status(501).json({
      success: false,
      message: `Chức năng ${name} chưa được định nghĩa.`
    });
};

// ===== PUBLIC BOOKING =====

router.get(
  '/availability',
  safeHandler(
    bookingController.checkAvailability,
    'checkAvailability'
  )
);

router.post(
  '/quote',
  safeHandler(
    bookingController.calculateQuote,
    'calculateQuote'
  )
);

router.post(
  '/create',
  safeHandler(
    bookingController.createBooking,
    'createBooking'
  )
);

router.get(
  '/lookup',
  safeHandler(
    bookingController.getBookingByCodeAndEmail,
    'getBookingByCodeAndEmail'
  )
);

// ===== SPRINT 3 =====

router.put(
  '/:bookingId/modify',
  verifyToken,
  staffOnly,
  safeHandler(
    bookingController.modifyBooking,
    'modifyBooking'
  )
);

router.post(
  '/walk-in',
  verifyToken,
  staffOnly,
  safeHandler(
    bookingController.createWalkInBooking,
    'createWalkInBooking'
  )
);

// ===== SPRINT 4 CHECKOUT =====

router.get(
  '/:bookingId/checkout-preview',
  verifyToken,
  staffOnly,
  safeHandler(
    bookingController.getCheckoutPreview,
    'getCheckoutPreview'
  )
);

router.post(
  '/:bookingId/checkout-confirm',
  verifyToken,
  staffOnly,
  safeHandler(
    bookingController.confirmCheckout,
    'confirmCheckout'
  )
);

module.exports = router;
