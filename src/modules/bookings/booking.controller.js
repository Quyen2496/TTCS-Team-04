const Booking = require('./booking.model');
const crypto = require('crypto');

// Hàm sinh mã booking ngẫu nhiên 8 ký tự duy nhất
const generateBookingCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// 1. Task S2-07: Tạo yêu cầu đặt phòng (Gửi thông tin, nhận mã 8 ký tự và giữ chỗ 24 tiếng)
exports.createBooking = async (req, res) => {
  try {
    const { guestName, phone, email, roomTypeId, checkIn, checkOut, guestCount, totalAmount } = req.body;

    // Kiểm tra thông tin bắt buộc
    if (!guestName || !phone || !email || !checkIn || !checkOut || !roomTypeId) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    // Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Số điện thoại không đúng định dạng (10 chữ số).' });
    }

    // Tạo mã booking 8 ký tự
    const bookingCode = generateBookingCode();

    // Tính thời gian hết hạn giữ chỗ (24 tiếng từ thời điểm tạo)
    const holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newBooking = new Booking({
      bookingCode,
      guestName,
      phone,
      email: email.trim().toLowerCase(),
      roomTypeId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestCount,
      totalAmount,
      status: 'PENDING',
      holdExpiresAt
    });

    await newBooking.save();

    res.status(201).json({
      message: 'Tạo yêu cầu đặt phòng thành công!',
      booking: {
        bookingCode: newBooking.bookingCode,
        guestName: newBooking.guestName,
        checkIn: newBooking.checkIn,
        checkOut: newBooking.checkOut,
        totalAmount: newBooking.totalAmount,
        holdExpiresAt: newBooking.holdExpiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// 2. Task S2-08: Tra cứu booking bằng CẶP Mã booking + Email
exports.getBookingByCodeAndEmail = async (req, res) => {
  try {
    const { bookingCode, email } = req.query;

    if (!bookingCode || !email) {
      return res.status(400).json({ message: 'Vui lòng nhập cả mã đặt phòng và email.' });
    }

    // Khai báo đối chiếu đồng thời cả mã booking và email
    const booking = await Booking.findOne({ 
      bookingCode: bookingCode.trim().toUpperCase(), 
      email: email.trim().toLowerCase() 
    }).populate('roomTypeId', 'name');

    // Trả cùng một thông báo lỗi nếu nhập sai mã hoặc email để đảm bảo bảo mật
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đặt phòng hợp lệ.' });
    }

    // Trả về thông tin công khai, loại bỏ thông tin nhạy cảm/giấy tờ/ghi chú nội bộ
    res.status(200).json({
      bookingCode: booking.bookingCode,
      guestName: booking.guestName,
      roomType: booking.roomTypeId ? booking.roomTypeId.name : 'Loại phòng',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guestCount: booking.guestCount,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      status: booking.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};