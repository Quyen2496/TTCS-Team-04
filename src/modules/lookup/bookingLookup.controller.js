/**
 * Controller Tra cứu Booking (Public Endpoint - dành cho Khách hàng)
 * Module: lookup
 */

// Lưu số lần tra cứu sai tạm thời (In-memory Rate Limiting)
const failedAttempts = new Map();

const LOOKUP_LIMIT = 5; // Tối đa 5 lần thử sai
const LOCK_TIME_MS = 15 * 60 * 1000; // Khóa 15 phút nếu vượt quá giới hạn

const lookupBooking = async (req, res) => {
  try {
    const { bookingCode, email } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // 1. Kiểm tra Giới hạn Tra cứu Sai (Rate Limit Check)
    const attemptData = failedAttempts.get(clientIp) || { count: 0, lockUntil: 0 };
    if (attemptData.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((attemptData.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút.`
      });
    }

    // 2. Validate dữ liệu đầu vào
    if (!bookingCode || !email) {
      return res.status(400).json({
        success: false,
        message: "Mã đặt phòng và Email không được để trống."
      });
    }

    // 3. Dữ liệu giả lập (Mock Database)
    const mockBookings = [
      {
        bookingCode: "BK20261004",
        customerEmail: "quynh.test@gmail.com",
        customerName: "Phạm Xuân Quỳnh",
        phoneNumber: "0987654321",
        roomType: "Deluxe Ocean View",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-12",
        numberOfGuests: 2,
        totalAmount: 3500000,
        paymentStatus: "PAID",
        bookingStatus: "CONFIRMED",
        // Trường NHẠY CẢM (Cần lọc bỏ khi trả về cho khách)
        idCardNumber: "001199001234", 
        internalNotes: "Khách VIP, cần xếp phòng tầng cao xa thang máy" 
      }
    ];

    // 4. Tìm kiếm đúng CẶP (Mã booking + Email)
    const booking = mockBookings.find(
      b => b.bookingCode.trim().toUpperCase() === bookingCode.trim().toUpperCase() &&
           b.customerEmail.trim().toLowerCase() === email.trim().toLowerCase()
    );

    // 5. Thất bại: Sai mã HOẶC sai email (Trả chung thông báo bảo mật)
    if (!booking) {
      attemptData.count += 1;
      if (attemptData.count >= LOOKUP_LIMIT) {
        attemptData.lockUntil = Date.now() + LOCK_TIME_MS;
      }
      failedAttempts.set(clientIp, attemptData);

      return res.status(404).json({
        success: false,
        message: "Mã đặt phòng hoặc Email không chính xác. Vui lòng kiểm tra lại."
      });
    }

    // Reset đếm sai khi tra cứu thành công
    failedAttempts.delete(clientIp);

    // 6. Thành công: LỌC BỎ dữ liệu nhạy cảm (Không trả idCardNumber & internalNotes)
    const publicBookingData = {
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      phoneNumber: booking.phoneNumber,
      roomType: booking.roomType,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfGuests: booking.numberOfGuests,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus
    };

    return res.status(200).json({
      success: true,
      message: "Tra cứu thông tin đặt phòng thành công.",
      data: publicBookingData
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tra cứu thông tin đặt phòng.",
      error: error.message
    });
  }
};

module.exports = {
  lookupBooking
};