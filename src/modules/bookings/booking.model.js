const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true, unique: true }, // Mã 8 ký tự duy nhất
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guestCount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], 
    default: 'PENDING' 
  },
  holdExpiresAt: { type: Date, required: true }, // Hạn giữ chỗ 24 giờ
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
