const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Room = require('../rooms/room.model');
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

// 5. Task Sprint 3 (T4): Đổi ngày / loại phòng
exports.modifyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newRoomTypeId, newCheckIn, newCheckOut } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã ID đặt phòng (bookingId).' });
    }

    if (!newRoomTypeId && !newCheckIn && !newCheckOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin mới cần thay đổi (loại phòng hoặc ngày checkIn/checkOut).'
      });
    }

    // 1. Tính toán giá mới và chênh lệch từ Service
    const quoteDiff = await bookingService.calculateModificationQuote({
      bookingId,
      newRoomTypeId,
      newCheckIn,
      newCheckOut
    });

    // 2. Cập nhật thông tin vào DB
    const updatedBooking = await bookingService.modifyBooking(bookingId, {
      newRoomTypeId,
      newCheckIn,
      newCheckOut,
      newTotalAmount: quoteDiff.newTotalAmount
    });

    return res.status(200).json({
      success: true,
      message: 'Thay đổi thông tin đặt phòng thành công!',
      priceDifference: quoteDiff.priceDifference,
      oldTotalAmount: quoteDiff.oldTotalAmount,
      newTotalAmount: quoteDiff.newTotalAmount,
      data: updatedBooking
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi thay đổi thông tin đặt phòng.'
    });
  }
};

// 6. Task Sprint 3 (T4): Đặt phòng cho khách vãng lai (Walk-in Guest)
exports.createWalkInBooking = async (req, res) => {
  try {
    const { guestName, phone, roomTypeId, checkIn, checkOut } = req.body;

    if (!guestName || !phone || !roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: Tên khách, SĐT, loại phòng, ngày checkIn và checkOut.'
      });
    }

    // Validate định dạng SĐT
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không đúng định dạng (10 chữ số Việt Nam).'
      });
    }

    // Gọi service tạo đơn vãng lai
    const booking = await bookingService.createWalkInBooking(req.body);

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn đặt phòng cho khách vãng lai thành công!',
      data: booking
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tạo đơn khách vãng lai.'
    });
  }
};

// ===== SPRINT 4 CHECKOUT =====

/**
 * LÁT 1, 2, 3, 4: API Xem trước bảng tính tiền trả phòng
 */
exports.getCheckoutPreview = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const actualCheckOutInput = req.query.actualCheckOut 
            ? new Date(req.query.actualCheckOut) 
            : new Date();

        const booking = await Booking.findById(bookingId).populate('roomTypeId roomId');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
        }

        // Kiểm tra trạng thái: Chỉ booking đang ở (IN_HOUSE) mới được trả phòng
        if (booking.status !== 'IN_HOUSE') {
            return res.status(400).json({ 
                success: false, 
                message: 'Chỉ có thể mở màn hình trả phòng cho booking đang ở (IN_HOUSE).' 
            });
        }

        const roomPricePerNight = booking.pricePerNight || (booking.roomTypeId ? booking.roomTypeId.price : 0);
        const standardGuests = booking.roomTypeId ? (booking.roomTypeId.standardGuests || 2) : 2;
        const extraGuestFeePerHead = booking.roomTypeId ? (booking.roomTypeId.extraGuestFee || 100000) : 100000;

        // LÁT 1 & 4: Tính số đêm đặt và số đêm thực tế (Luôn tính đủ số đêm đã đặt nếu trả sớm)
        const expectedCheckIn = new Date(booking.checkInDate || booking.checkIn);
        const expectedCheckOut = new Date(booking.checkOutDate || booking.checkOut);
        
        let bookedNights = Math.ceil((expectedCheckOut - expectedCheckIn) / (1000 * 60 * 60 * 24));
        if (bookedNights <= 0) bookedNights = 1;

        const isEarlyCheckout = actualCheckOutInput < expectedCheckOut;

        // LÁT 1: Tính tiền phòng theo đêm
        const nightDetails = [];
        let totalRoomFee = 0;
        for (let i = 0; i < bookedNights; i++) {
            const nightDate = new Date(expectedCheckIn);
            nightDate.setDate(nightDate.getDate() + i);
            nightDetails.push({
                night: i + 1,
                date: nightDate.toISOString().split('T')[0],
                price: roomPricePerNight
            });
            totalRoomFee += roomPricePerNight;
        }

        // LÁT 2: Phụ thu thêm người
        const actualGuests = booking.guestCount || 1;
        const extraGuests = Math.max(0, actualGuests - standardGuests);
        const extraGuestSurchargePerNight = extraGuests * extraGuestFeePerHead;
        const totalExtraGuestSurcharge = extraGuestSurchargePerNight * bookedNights;

        // LÁT 3: Phụ thu trả muộn
        let lateCheckoutSurcharge = 0;
        let lateHours = 0;
        let isOvernightCharged = false;

        const checkoutHour = actualCheckOutInput.getHours();
        const checkoutMinutes = actualCheckOutInput.getMinutes();

        // Mốc trễ sau 12:00
        if (checkoutHour >= 12 && (checkoutHour > 12 || checkoutMinutes > 0)) {
            if (checkoutHour > 18 || (checkoutHour === 18 && checkoutMinutes > 0)) {
                // Quá 18:00 -> Tính thêm 1 đêm phòng
                lateCheckoutSurcharge = roomPricePerNight;
                isOvernightCharged = true;
            } else {
                // Từ sau 12:00 đến 18:00 -> Tính theo giờ (làm tròn lên)
                lateHours = checkoutHour - 12 + (checkoutMinutes > 0 ? 1 : 0);
                const hourlyRate = roomPricePerNight * 0.1; // Mặc định 10% giá phòng/giờ
                lateCheckoutSurcharge = lateHours * hourlyRate;
            }
        }

        // LÁT 1: Tổng cọc đã ghi nhận
        const totalDeposit = booking.totalDeposit || booking.depositAmount || 0;

        // Tổng tiền & Số tiền còn phải thu
        const totalAmount = totalRoomFee + totalExtraGuestSurcharge + lateCheckoutSurcharge;
        const remainingAmount = totalAmount - totalDeposit;

        return res.status(200).json({
            success: true,
            data: {
                bookingId: booking._id,
                bookingCode: booking.code || booking._id,
                status: booking.status,
                guestName: booking.customerName || booking.guestName,
                roomName: booking.roomId ? booking.roomId.name : 'N/A',
                pricePerNight: roomPricePerNight,
                bookedNights,
                isEarlyCheckout,
                nightDetails,
                extraGuestInfo: {
                    actualGuests,
                    standardGuests,
                    extraGuests,
                    surchargePerNight: extraGuestSurchargePerNight,
                    totalSurcharge: totalExtraGuestSurcharge
                },
                lateCheckoutInfo: {
                    actualCheckOut: actualCheckOutInput,
                    lateHours,
                    isOvernightCharged,
                    surcharge: lateCheckoutSurcharge
                },
                summary: {
                    totalRoomFee,
                    totalExtraGuestSurcharge,
                    lateCheckoutSurcharge,
                    totalAmount,
                    totalDeposit,
                    remainingAmount // Có thể âm nếu cọc lớn hơn tổng tiền
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi server:', error: error.message });
    }
};

/**
 * LÁT 5: API Xác nhận trả phòng, thanh toán & đóng booking (Dùng DB Transaction)
 */
exports.confirmCheckout = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { bookingId } = req.params;
        const { paymentMethod, earlyCheckoutReason, actualCheckOut } = req.body;

        const booking = await Booking.findById(bookingId).session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
        }

        if (booking.status !== 'IN_HOUSE') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Booking đã đóng hoặc chưa nhận phòng.' });
        }

        // LÁT 4: Bắt buộc lý do nếu trả sớm
        const expectedCheckOut = new Date(booking.checkOutDate || booking.checkOut);
        const checkOutTime = actualCheckOut ? new Date(actualCheckOut) : new Date();

        if (checkOutTime < expectedCheckOut) {
            if (!earlyCheckoutReason || earlyCheckoutReason.trim() === '') {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Trường hợp trả phòng sớm bắt buộc phải nhập lý do.' 
                });
            }
            booking.earlyCheckoutReason = earlyCheckoutReason.trim();
        }

        // LÁT 5: Chặn nếu chưa chọn hình thức thanh toán
        if (!paymentMethod) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng chọn hình thức thanh toán (Tiền mặt hoặc Chuyển khoản).' 
            });
        }

        // Cập nhật trạng thái Booking -> CLOSED
        booking.status = 'CLOSED'; // Hoặc COMPLETED tùy enum project
        booking.paymentMethod = paymentMethod;
        booking.actualCheckOutDate = checkOutTime;
        await booking.save({ session });

        // Chuyển trạng thái Phòng -> DIRTY_VACANT (Trống bẩn)
        if (booking.roomId) {
            await Room.findByIdAndUpdate(
                booking.roomId, 
                { status: 'DIRTY_VACANT' }, 
                { session }
            );
        }

        // Commit Transaction đồng bộ cả 2 thao tác
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: 'Hoàn tất trả phòng thành công. Booking đã đóng và phòng chuyển sang Trống bẩn (DIRTY_VACANT).'
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, message: 'Lỗi khi đóng booking:', error: error.message });
    }
};
