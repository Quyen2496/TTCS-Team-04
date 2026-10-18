const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Room = require('../rooms/room.model'); // Điều chỉnh path nếu cần
const surchargeService = require('./booking-surcharge.service');
const { calculateCheckout } = require('./checkout-calculation');
const {
    EXTRA_GUEST_UNIT_PRICE,
    EXTRA_BED_UNIT_PRICE
} = require('../../config/booking-surcharge-parameters');

exports.addSurcharges = async (req, res) => {
    try {
        const result = await surchargeService.addSurcharges({
            bookingId: req.params.bookingId,
            items: req.body && req.body.items,
            actor: req.user && (req.user.email || req.user.username)
        });
        return res.status(200).json({
            success: true,
            message: 'Đã thêm phụ thu vào booking.',
            data: result
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Không thể thêm phụ thu.'
        });
    }
};

exports.getSurchargeParameters = (req, res) => res.status(200).json({
    success: true,
    data: {
        EXTRA_GUEST: EXTRA_GUEST_UNIT_PRICE,
        EXTRA_BED: EXTRA_BED_UNIT_PRICE
    }
});

exports.getBookingByCodeAndEmail = async (req, res) => {
    try {
        const bookingCode = String(req.query.bookingCode || '').trim().toUpperCase();
        const email = String(req.query.email || '').trim().toLowerCase();
        if (!bookingCode || !email) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã booking và email.' });
        }

        const booking = await Booking.findOne({
            bookingCode,
            $expr: { $eq: [{ $toLower: { $ifNull: ['$email', ''] } }, email] }
        }).lean();
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking phù hợp với mã và email đã nhập.' });
        }
        return res.status(200).json({ success: true, data: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Không thể tìm booking.' });
    }
};

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
        if (!['IN_HOUSE', 'CHECKED_IN'].includes(booking.status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Chỉ có thể mở màn hình trả phòng cho booking đang ở (IN_HOUSE).' 
            });
        }

        const checkout = calculateCheckout(booking, actualCheckOutInput);

        return res.status(200).json({
            success: true,
            data: {
                bookingId: booking._id,
                bookingCode: booking.bookingCode || booking.code || booking._id,
                status: booking.status,
                guestName: booking.customerName || booking.guestName,
                roomName: booking.roomId ? (booking.roomId.roomNumber || booking.roomId.name) : 'N/A',
                pricePerNight: checkout.roomPricePerNight,
                bookedNights: checkout.bookedNights,
                isEarlyCheckout: checkout.isEarlyCheckout,
                nightDetails: checkout.nightDetails,
                lineItems: checkout.lineItems,
                invoiceLineItems: checkout.invoiceLineItems,
                surchargeDefaults: {
                    EXTRA_GUEST: EXTRA_GUEST_UNIT_PRICE,
                    EXTRA_BED: EXTRA_BED_UNIT_PRICE
                },
                extraGuestInfo: {
                    actualGuests: checkout.actualGuests,
                    standardGuests: checkout.standardGuests,
                    capacity: checkout.capacity,
                    extraGuests: checkout.baselineExtraGuests,
                    surchargePerNight: checkout.baselineExtraGuests * EXTRA_GUEST_UNIT_PRICE,
                    totalSurcharge: checkout.baselineExtraGuestSurcharge
                },
                addedSurchargeInfo: {
                    items: checkout.surchargeLineItems,
                    totalExtraGuestSurcharge: checkout.totalAddedGuestSurcharge,
                    totalExtraBedSurcharge: checkout.totalExtraBedSurcharge
                },
                lateCheckoutInfo: {
                    actualCheckOut: checkout.actualCheckOut,
                    lateHours: checkout.lateHours,
                    isOvernightCharged: checkout.isOvernightCharged,
                    surcharge: checkout.lateCheckoutSurcharge
                },
                summary: {
                    totalRoomFee: checkout.totalRoomFee,
                    totalExtraGuestSurcharge: checkout.totalExtraGuestSurcharge,
                    totalExtraBedSurcharge: checkout.totalExtraBedSurcharge,
                    lateCheckoutSurcharge: checkout.lateCheckoutSurcharge,
                    totalAmount: checkout.totalAmount,
                    totalDeposit: checkout.totalDeposit,
                    remainingAmount: checkout.remainingAmount
                }
            }
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Lỗi server.' });
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

        const booking = await Booking.findById(bookingId).populate('roomTypeId').session(session);

        if (!booking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
        }

        if (!['IN_HOUSE', 'CHECKED_IN'].includes(booking.status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Booking đã đóng hoặc chưa nhận phòng.' });
        }

        // LÁT 4: Bắt buộc lý do nếu trả sớm
        const checkOutTime = actualCheckOut ? new Date(actualCheckOut) : new Date();
        const checkout = calculateCheckout(booking, checkOutTime);

        if (checkout.isEarlyCheckout) {
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
        const paymentMethodKey = String(paymentMethod || '').trim().toUpperCase();
        const normalizedPaymentMethod = ['CASH', 'TIỀN MẶT'].includes(paymentMethodKey)
            ? 'CASH'
            : ['BANK_TRANSFER', 'TRANSFER', 'BANK', 'CHUYỂN KHOẢN'].includes(paymentMethodKey)
                ? 'BANK_TRANSFER'
                : null;
        if (!normalizedPaymentMethod) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng chọn hình thức thanh toán (Tiền mặt hoặc Chuyển khoản).' 
            });
        }

        // Cập nhật trạng thái Booking -> CLOSED
        booking.status = 'CLOSED'; // Hoặc COMPLETED tùy enum project
        booking.paymentMethod = normalizedPaymentMethod;
        booking.actualCheckOutDate = checkOutTime;
        booking.totalAmount = checkout.totalAmount;
        booking.checkoutSnapshot = {
            ...checkout,
            earlyCheckoutReason: checkout.isEarlyCheckout ? earlyCheckoutReason.trim() : '',
            paymentMethod: normalizedPaymentMethod,
            finalizedAt: new Date()
        };
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
            message: 'Hoàn tất trả phòng thành công. Booking đã đóng và phòng chuyển sang Trống bẩn (DIRTY_VACANT).',
            data: {
                bookingId: booking._id,
                status: booking.status,
                paymentMethod: booking.paymentMethod,
                checkout: booking.checkoutSnapshot
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Lỗi khi đóng booking.' });
    }
};
