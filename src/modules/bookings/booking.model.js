const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true, unique: true }, // Mã đặt phòng duy nhất
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
<<<<<<< HEAD
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false }, // Cho phép linh hoạt khi tạo mới hoặc gán sau
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
=======
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
>>>>>>> c31a10da1ac88f3723d04fad460b8c53d5c0c7b0
  guestCount: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  status: { 
    type: String, 
<<<<<<< HEAD
    enum: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN', 'CANCELLED', 'COMPLETED'], 
=======
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CLOSED'], 
>>>>>>> c31a10da1ac88f3723d04fad460b8c53d5c0c7b0
    default: 'PENDING' 
  },
  isWalkIn: { type: Boolean, default: false }, // Phân biệt khách vãng lai tại quầy
  holdExpiresAt: { type: Date, required: false }, // Hạn giữ chỗ 24 giờ (tùy chọn cho walk-in)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);