const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Room = require('../rooms/room.model'); // Điều chỉnh path nếu cần

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