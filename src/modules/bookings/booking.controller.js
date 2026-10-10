const Booking = require('./booking.model');
const bookingService = require('./booking.service');
const crypto = require('crypto');

const generateBookingCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// 1. Task S2-05: Tìm phòng trống
exports.checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, guestCount } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ checkIn và checkOut.'
      });
    }

    const data = await bookingService.getAvailableRoomTypes({ checkIn, checkOut, guestCount });

    return res.status(200).json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra phòng trống.'
    });
  }
};

// 2. Task S2-06: Báo giá
exports.calculateQuote = async (req, res) => {
  try {
    const { roomTypeId, checkIn, checkOut, quantity } = req.body;

    if (!roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng truyền đầy đủ roomTypeId, checkIn, và checkOut.'
      });
    }

    const quote = await bookingService.calculateQuote({
      roomTypeId,
      checkIn,
      checkOut,
      quantity
    });

    return res.status(200).json({
      success: true,
      data: quote
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi tính báo giá.'
    });
  }
};

// 3. Task S2-07 & S3-02: Tạo yêu cầu đặt phòng (Có kiểm tra trùng lặp & Trả lỗi 409)
exports.createBooking = async (req, res) => {
  try {
    const { guestName, phone, email, roomTypeId, checkIn, checkOut, guestCount } = req.body;

    if (!guestName || !phone || !email || !checkIn || !checkOut || !roomTypeId) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không đúng định dạng (10 chữ số).' });
    }

    const quote = await bookingService.calculateQuote({ roomTypeId, checkIn, checkOut });
    const bookingCode = generateBookingCode();
    const holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newBooking = await bookingService.createBookingService({
      bookingCode,
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      roomTypeId,
      checkIn,
      checkOut,
      guestCount: parseInt(guestCount, 10) || 1,
      totalAmount: quote.totalAmount,
      holdExpiresAt
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu đặt phòng thành công!',
      booking: newBooking
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tạo đặt phòng.'
    });
  }
};

// 4. Task S2-08: Tra cứu booking
exports.getBookingByCodeAndEmail = async (req, res) => {
  try {
    const { bookingCode, email } = req.query;

    if (!bookingCode || !email) {
      return res.status(400).json({ message: 'Vui lòng nhập cả mã đặt phòng và email.' });
    }

    const booking = await Booking.findOne({ 
      bookingCode: bookingCode.trim().toUpperCase(), 
      email: email.trim().toLowerCase() 
    }).lean();

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đặt phòng hợp lệ.' });
    }

    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// 5. Task S3-02: Cancel a booking and release its reserved nights.
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const cancelledBooking = await bookingService.cancelBookingService(bookingId);

    return res.status(200).json({
      success: true,
      message: 'Hủy booking thành công, phòng đã được giải phóng!',
      data: cancelledBooking
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi khi hủy booking.'
    });
  }
};
