const mongoose = require('mongoose');

const surchargeSchema = new mongoose.Schema({
  type: { type: String, enum: ['EXTRA_GUEST', 'EXTRA_BED'], required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  defaultUnitPrice: { type: Number, required: true, min: 0 },
  nights: { type: Number, required: true, min: 1 },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  overrideReason: { type: String, trim: true, maxlength: 300, default: '' },
  addedBy: { type: String, trim: true, default: '' },
  addedAt: { type: Date, default: Date.now }
}, { _id: true });

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true, unique: true }, // Mã 8 ký tự duy nhất
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  guestCount: { type: Number, required: true },
  surcharges: { type: [surchargeSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN', 'IN_HOUSE', 'CANCELLED', 'COMPLETED', 'CLOSED'],
    default: 'PENDING' 
  },
  paymentMethod: { type: String, enum: ['CASH', 'BANK_TRANSFER'] },
  actualCheckOutDate: { type: Date },
  earlyCheckoutReason: { type: String, trim: true, maxlength: 500 },
  checkoutSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  holdExpiresAt: { type: Date, required: true }, // Hạn giữ chỗ 24 giờ
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
