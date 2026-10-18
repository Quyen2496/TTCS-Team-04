const mongoose = require('mongoose');
const Booking = require('./booking.model');

exports.getBookingInvoiceData = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Mã booking không hợp lệ.' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('roomId', 'roomNumber')
      .lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
    }
    if (booking.status !== 'CLOSED' || !booking.checkoutSnapshot) {
      return res.status(409).json({
        success: false,
        message: 'Chỉ xem hóa đơn sau khi booking đã hoàn tất trả phòng.'
      });
    }

    const checkout = booking.checkoutSnapshot;
    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        guestName: booking.guestName,
        roomNumber: booking.roomId && booking.roomId.roomNumber,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.actualCheckOutDate || booking.checkOutDate,
        lineItems: checkout.invoiceLineItems || checkout.lineItems || [],
        totalAmount: checkout.remainingAmount,
        totalAmountInWords: '',
        paymentMethod: booking.paymentMethod
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Không thể tải dữ liệu hóa đơn.' });
  }
};
