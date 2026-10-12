const mongoose = require('mongoose');

let Booking;
try {
  Booking = require('../bookings/booking.model');
} catch (e) {
  Booking = mongoose.model('Booking');
}

let Room;
try {
  Room = require('../rooms/room.model');
} catch (e) {
  Room = mongoose.model('Room');
}

/**
 * Lấy danh sách sơ đồ phòng trong khoảng thời gian [from, to) (Tối đa 14 ngày)
 */
const getRoomBoardData = async ({ from, to }) => {
  const startDate = from ? new Date(from) : new Date();
  startDate.setHours(0, 0, 0, 0);

  let endDate;
  if (to) {
    endDate = new Date(to);
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14); // Mặc định xem 14 ngày
  }
  endDate.setHours(23, 59, 59, 999);

  // 1. Lấy danh sách tất cả các phòng
  const rooms = await Room.find().lean();

  // 2. Lấy các booking còn hiệu lực trong khoảng thời gian
  const bookings = await Booking.find({
    status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    checkInDate: { $lte: endDate },
    checkOutDate: { $gte: startDate }
  }).lean();

  // 3. Ghép thông tin booking vào từng phòng
  const boardData = rooms.map(room => {
    const roomBookings = bookings.filter(
      b => b.roomId && b.roomId.toString() === room._id.toString()
    );

    return {
      roomId: room._id,
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId,
      status: room.status, // Trạng thái hiện tại của phòng (VD: CLEAN, DIRTY, MAINTENANCE)
      schedule: roomBookings.map(b => ({
        bookingId: b._id,
        bookingCode: b.bookingCode,
        guestName: b.guestName || 'Khách lẻ',
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status
      }))
    };
  });

  return {
    period: {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0]
    },
    totalRooms: rooms.length,
    board: boardData
  };
};

module.exports = {
  getRoomBoardData
};