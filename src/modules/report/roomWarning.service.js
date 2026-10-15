const mongoose = require('mongoose');

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

let Room = null;
try {
  Room = require('../rooms/room.model');
} catch (e) {
  try {
    Room = mongoose.model('Room');
  } catch (err) {
    // Bỏ qua nếu chưa có model Room riêng
  }
}

const getRoomShortageWarnings = async ({ startDate, endDate }) => {
  try {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);

    const activeBookings = await Booking.find({
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      checkInDate: { $lte: end },
      checkOutDate: { $gte: start }
    }).select('bookingCode roomTypeId checkInDate checkOutDate status guestName');

    let roomTypeCapacity = {};
    if (Room) {
      const roomTypes = await Room.aggregate([
        { $group: { _id: '$roomTypeId', totalRooms: {$sum: 1 } } }
      ]);
      roomTypes.forEach(rt => {
        if (rt._id) {
          roomTypeCapacity[rt._id.toString()] = rt.totalRooms;
        }
      });
    }

    const dailyMap = {};

    activeBookings.forEach(booking => {
      let curr = new Date(booking.checkInDate);
      const bookingCheckout = new Date(booking.checkOutDate);

      while (curr < bookingCheckout && curr <= end) {
        if (curr >= start) {
          const dateStr = curr.toISOString().split('T')[0];
          const typeId = booking.roomTypeId ? booking.roomTypeId.toString() : 'UNKNOWN';
          const key = `${dateStr}_${typeId}`;

          if (!dailyMap[key]) {
            dailyMap[key] = {
              date: dateStr,
              roomTypeId: typeId,
              activeBookingsCount: 0,
              bookings: []
            };
          }
          dailyMap[key].activeBookingsCount += 1;
          dailyMap[key].bookings.push({
            bookingId: booking._id,
            bookingCode: booking.bookingCode,
            guestName: booking.guestName || 'Khách lẻ',
            status: booking.status
          });
        }
        curr.setDate(curr.getDate() + 1);
      }
    });

    const warnings = [];
    Object.values(dailyMap).forEach(item => {
      const totalAvailable = roomTypeCapacity[item.roomTypeId] || 10; 

      if (item.activeBookingsCount > totalAvailable) {
        warnings.push({
          date: item.date,
          roomTypeId: item.roomTypeId,
          totalRooms: totalAvailable,
          activeBookingsCount: item.activeBookingsCount,
          shortageCount: item.activeBookingsCount - totalAvailable,
          relatedBookings: item.bookings
        });
      }
    });

    return {
      period: { 
        start: start.toISOString().split('T')[0], 
        end: end.toISOString().split('T')[0] 
      },
      warningCount: warnings.length,
      warnings
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getRoomShortageWarnings
};