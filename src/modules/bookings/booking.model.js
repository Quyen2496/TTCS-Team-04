const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true, unique: true }, // Mã đặt phòng duy nhất
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false }, // Cho phép linh hoạt khi tạo mới hoặc gán sau
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guestCount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN', 'CANCELLED', 'COMPLETED'], 
    default: 'PENDING' 
  },
  isWalkIn: { type: Boolean, default: false }, // Phân biệt khách vãng lai tại quầy
  holdExpiresAt: { type: Date, required: false }, // Hạn giữ chỗ 24 giờ (tùy chọn cho walk-in)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);