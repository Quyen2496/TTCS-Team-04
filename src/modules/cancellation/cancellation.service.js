const mongoose = require('mongoose');



// Import Booking model (Tự động fallback nếu đường dẫn mẫu chưa đúng)

let Booking;

try {

  Booking = require('../bookings/booking.model');

} catch (e) {

  try {

    Booking = require('../bookings/booking.schema');

  } catch (err) {

    Booking = mongoose.model('Booking');

  }

}



// Import RoomNight model an toàn (nếu chưa có thì bỏ qua không crash server)

let RoomNight = null;

try {

  RoomNight = require('../bookings/roomNight.model');

} catch (e) {

  // Bỏ qua nếu dự án chưa tạo model RoomNight riêng

}



/**

 * Tính toán tỷ lệ hoàn cọc dựa trên số ngày huỷ trước check-in

 */

const calculateRefundPolicy = (checkInDate, totalDeposit) => {

  // Bảo vệ: Kiểm tra nếu checkInDate không hợp lệ thì trả về 0 tránh lỗi NaN

  if (!checkInDate || isNaN(new Date(checkInDate).getTime())) {

    return { refundPercent: 0, refundAmount: 0, diffDays: 0 };

  }



  const now = new Date();

  const checkIn = new Date(checkInDate);

  const diffTime = checkIn.getTime() - now.getTime();

  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));



  let refundPercent = 0;

  if (diffDays >= 7) {

    refundPercent = 100; // >= 7 ngày: Hoàn 100%

  } else if (diffDays >= 3) {

    refundPercent = 50;  // 3-6 ngày: Hoàn 50%

  } else {

    refundPercent = 0;   // < 3 ngày: Không hoàn

  }



  const refundAmount = Math.round((totalDeposit * refundPercent) / 100);

  return { refundPercent, refundAmount, diffDays };

};



/**

 * Preview thông tin huỷ phòng

 */

const previewCancelBooking = async (bookingId) => {

  const booking = await Booking.findById(bookingId);

  if (!booking) {

    const err = new Error('Không tìm thấy thông tin booking.');

    err.status = 404;

    throw err;

  }



  if (booking.status === 'CHECKED_IN') {

    const err = new Error('Booking đã nhận phòng không thể huỷ, vui lòng làm thủ tục trả phòng sớm.');

    err.status = 400;

    throw err;

  }



  if (['CANCELLED', 'CLOSED'].includes(booking.status)) {

    const err = new Error(`Booking đang ở trạng thái ${booking.status}, không thể huỷ.`);

    err.status = 400;

    throw err;

  }



  const totalDeposit = booking.totalDeposit || 0;

  const policy = calculateRefundPolicy(booking.checkInDate, totalDeposit);



  return {

    bookingCode: booking.bookingCode,

    status: booking.status,

    totalDeposit,

    refundPercent: policy.refundPercent,

    refundAmount: policy.refundAmount,

    policyNote: `Huỷ trước ${policy.diffDays} ngày so với ngày nhận phòng.`

  };

};



/**

 * Commit Huỷ booking

 */

const commitCancelBooking = async ({ bookingId, reason, expectedVersion, actor }) => {

  try {

    const booking = await Booking.findById(bookingId);

    if (!booking) {

      const err = new Error('Không tìm thấy thông tin booking.');

      err.status = 404;

      throw err;

    }



    if (booking.status === 'CHECKED_IN') {

      const err = new Error('Booking đã nhận phòng không thể huỷ.');

      err.status = 400;

      throw err;

    }



    if (booking.status === 'CANCELLED') {

      return {

        bookingCode: booking.bookingCode,

        status: booking.status,

        refundAmount: booking.cancellation?.refundAmount || 0,

        alreadyCancelled: true

      };

    }



    if (expectedVersion !== undefined && booking.version !== expectedVersion) {

      const err = new Error('Dữ liệu booking đã bị thay đổi bởi thao tác khác. Vui lòng tải lại.');

      err.status = 409;

      throw err;

    }



    const totalDeposit = booking.totalDeposit || 0;

    const policy = calculateRefundPolicy(booking.checkInDate, totalDeposit);

    const cancelledAt = new Date();



    // Cập nhật trạng thái hủy phòng trực tiếp

    const updatedBooking = await Booking.findByIdAndUpdate(

      bookingId,

      {

        status: 'CANCELLED',

        version: (booking.version || 0) + 1,

        cancellation: {

          reason,

          refundPercent: policy.refundPercent,

          refundAmount: policy.refundAmount,

          cancelledBy: actor,

          cancelledAt: cancelledAt

        }

      },

      { new: true, runValidators: false }

    );



    // Nhả tồn phòng (nếu có model RoomNight)

    if (RoomNight) {

      await RoomNight.deleteMany({ bookingId: booking._id });

    }



    return {

      bookingCode: updatedBooking.bookingCode,

      status: updatedBooking.status,

      refundPercent: policy.refundPercent,

      refundAmount: policy.refundAmount,

      cancelledAt: cancelledAt

    };

  } catch (error) {

    throw error;

  }

};



module.exports = {

  previewCancelBooking,

  commitCancelBooking

}; 

