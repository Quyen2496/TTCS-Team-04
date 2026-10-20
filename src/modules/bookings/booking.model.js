const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    required: true,
    unique: true
  },

  guestName: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  email: {
    type: String,
    default: ''
  },

  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomType',
    required: true
  },

  // Sprint 3 dùng checkIn/checkOut.
  // Một số luồng checkout cũ dùng checkInDate/checkOutDate.
  // Giữ cả hai để tương thích dữ liệu hiện có.
  checkIn: {
    type: Date,
    required: false
  },

  checkOut: {
    type: Date,
    required: false
  },

  checkInDate: {
    type: Date,
    required: false
  },

  checkOutDate: {
    type: Date,
    required: false
  },

  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },

  guestCount: {
    type: Number,
    default: 1
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  depositAmount: {
    type: Number,
    default: 0
  },

  totalDeposit: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: [
      'PENDING',
      'CONFIRMED',
      'PAID',
      'CHECKED_IN',
      'IN_HOUSE',
      'CANCELLED',
      'COMPLETED',
      'CLOSED'
    ],
    default: 'PENDING'
  },

  isWalkIn: {
    type: Boolean,
    default: false
  },

  holdExpiresAt: {
    type: Date,
    required: false
  },

  paymentMethod: {
    type: String,
    default: ''
  },

  actualCheckOutDate: {
    type: Date,
    required: false
  },

  earlyCheckoutReason: {
    type: String,
    default: ''
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
