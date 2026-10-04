const Booking = require('./booking.model');
const bookingService = require('./booking.service');
const crypto = require('crypto');

// Hàm sinh mã booking ngẫu nhiên 8 ký tự duy nhất
const generateBookingCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// 1. Task S2-05: Tìm phòng trống (Khả dụng)
exports.checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, guestCount } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ checkIn và checkOut.'
      });
    }

    const startTime = Date.now();
    const data = await bookingService.getAvailableRoomTypes({ checkIn, checkOut, guestCount });
    const duration = Date.now() - startTime;

    console.log(`[API Availability] Xử lý trong: ${duration}ms`);

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

// 2. Task S2-06: Báo giá (Server tự tính toán giá tiền)
exports.calculateQuote = async (req, res) => {
  try {
    const { roomTypeId, checkIn, checkOut, quantity } = req.body;

    if (!roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng truyền đầy đủ roomTypeId, checkIn, và checkOut.'
      });
    }

    // Gọi service tính toán báo giá từ phía Server
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

// 3. Task S2-07: Tạo yêu cầu đặt phòng (Gửi thông tin, kiểm tra khả dụng & tính lại giá tại chỗ)
exports.createBooking = async (req, res) => {
  try {
    const { guestName, phone, email, roomTypeId, checkIn, checkOut, guestCount } = req.body;

    // Kiểm tra thông tin bắt buộc
    if (!guestName || !phone || !email || !checkIn || !checkOut || !roomTypeId) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    // Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Số điện thoại không đúng định dạng (10 chữ số).' });
    }

    // BẢO MẬT & NGHIỆP VỤ: Server tự tính lại giá, không tin giá tiền do Frontend gửi
    const quote = await bookingService.calculateQuote({
      roomTypeId,
      checkIn,
      checkOut
    });

    // Tạo mã booking 8 ký tự
    const bookingCode = generateBookingCode();

    // Thời gian giữ chỗ 24 tiếng
    const holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newBooking = new Booking({
      bookingCode,
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      roomTypeId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestCount: parseInt(guestCount, 10) || 1,
      totalAmount: quote.totalAmount, // Sử dụng giá do Server tự tính
      status: 'PENDING',
      holdExpiresAt
    });

    await newBooking.save();

    return res.status(201).json({
      success: true,
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
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi máy chủ khi tạo đặt phòng.' 
    });
  }
};

// 4. Task S2-08: Tra cứu booking bằng CẶP Mã booking + Email
exports.getBookingByCodeAndEmail = async (req, res) => {
  try {
    const { bookingCode, email } = req.query;

    if (!bookingCode || !email) {
      return res.status(400).json({ message: 'Vui lòng nhập cả mã đặt phòng và email.' });
    }

    // Sử dụng lean() và không dùng .populate() để tránh lỗi Mongoose Model chưa đăng ký
    const booking = await Booking.findOne({ 
      bookingCode: bookingCode.trim().toUpperCase(), 
      email: email.trim().toLowerCase() 
    }).lean();

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đặt phòng hợp lệ.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingCode: booking.bookingCode,
        guestName: booking.guestName,
        email: booking.email,
        phone: booking.phone,
        roomTypeId: booking.roomTypeId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestCount: booking.guestCount,
        totalAmount: booking.totalAmount,
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};