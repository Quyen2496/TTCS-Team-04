const lookupService = require('./lookup.service');

// Lưu trữ số lần thử sai theo địa chỉ IP (Rate Limiting)
const rateLimitMap = new Map();

exports.lookupBooking = async (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const WINDOW_TIME = 15 * 60 * 1000; // 15 phút
    const MAX_ATTEMPTS = 10;            // Tối đa 10 lần thử sai

    // 1. Kiểm tra Rate Limit theo IP (S2-08 L2)
    let ipRecord = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + WINDOW_TIME };

    if (now > ipRecord.resetTime) {
      ipRecord = { count: 0, resetTime: now + WINDOW_TIME };
    }

    if (ipRecord.count >= MAX_ATTEMPTS) {
      const minutesRemaining = Math.ceil((ipRecord.resetTime - now) / 60000);
      return res.status(429).json({
        success: false,
        message: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutesRemaining} phút.`
      });
    }

    // 2. Lấy dữ liệu từ Request Body
    const { bookingCode, email } = req.body;

    if (!bookingCode || !email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ Mã đặt phòng và Email."
      });
    }

    // 3. Gọi Service để tìm thông tin
    const booking = await lookupService.findBookingByCodeAndEmail(bookingCode, email);

    // 4. Nếu không tìm thấy
    if (!booking) {
      ipRecord.count += 1;
      rateLimitMap.set(clientIp, ipRecord);

      return res.status(404).json({
        success: false,
        message: "Thông tin tra cứu không hợp lệ."
      });
    }

    // Nếu tìm thấy thành công, reset lại đếm lỗi cho IP này
    rateLimitMap.delete(clientIp);

    // 5. Trả về kết quả (Đã lọc bỏ thông tin nhạy cảm - S2-08 L1)
    return res.status(200).json({
      success: true,
      data: {
        bookingCode: booking.bookingCode,
        roomTypeName: booking.roomTypeName,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: booking.numberOfNights,
        totalAmount: booking.totalAmount,
        depositAmount: booking.depositAmount || 0,
        status: booking.status
      }
    });

  } catch (error) {
    // In lỗi chi tiết ra Terminal để dễ kiểm tra
    console.error("---> LỖI CHI TIẾT:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống, vui lòng thử lại sau.",
      errorDetails: error.message // Hiển thị lỗi ra Response để bạn thấy nguyên nhân
    });
  }
};