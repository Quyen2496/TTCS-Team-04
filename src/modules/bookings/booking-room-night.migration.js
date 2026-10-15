const Booking = require('./booking.model');
const BookingRoomNight = require('./booking-room-night.model');
const Room = require('../rooms/room.model');
const { ACTIVE_BOOKING_STATUSES } = require('./booking.service');
const { getStayRange, getNights } = require('./booking-dates');

const isReservationConflict = error => {
  const candidates = [
    error,
    ...(error?.writeErrors || []).map(writeError => writeError.err || writeError),
    ...(error?.result?.getWriteErrors?.() || [])
  ];

  return candidates.some(candidate =>
    candidate?.code === 11000 || candidate?.code === 112 || candidate?.codeName === 'WriteConflict'
  );
};

const cleanupReleasedReservations = async () => {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const staleReservationBookingIds = await BookingRoomNight.distinct('bookingId', {
    $or: [
      { createdAt: { $lt: staleBefore } },
      { createdAt: { $exists: false } }
    ]
  });

  if (staleReservationBookingIds.length) {
    const existingBookingIds = new Set((await Booking.distinct('_id', {
      _id: { $in: staleReservationBookingIds }
    })).map(id => id.toString()));
    const orphanBookingIds = staleReservationBookingIds.filter(
      id => !existingBookingIds.has(id.toString())
    );

    if (orphanBookingIds.length) {
      await BookingRoomNight.deleteMany({ bookingId: { $in: orphanBookingIds } });
    }
  }

  const releasedBookingIds = await Booking.distinct('_id', {
    status: { $in: ['CANCELLED', 'COMPLETED'] }
  });
  if (releasedBookingIds.length) {
    await BookingRoomNight.deleteMany({ bookingId: { $in: releasedBookingIds } });
  }
};

const migrateActiveBookings = async () => {
  await cleanupReleasedReservations();

  const bookings = await Booking.find({
    status: { $in: ACTIVE_BOOKING_STATUSES }
  }).sort({ checkIn: 1, _id: 1 });

  for (const booking of bookings) {
    const { start, end } = getStayRange(booking.checkIn, booking.checkOut);
    const nights = getNights(start, end);
    const existingReservations = await BookingRoomNight.find({ bookingId: booking._id })
      .select('roomId night')
      .lean();
    const existingRoomIds = new Set(existingReservations.map(reservation => reservation.roomId.toString()));
    const existingNightKeys = new Set(existingReservations.map(reservation => reservation.night.getTime()));

    if (
      existingRoomIds.size === 1 &&
      nights.length === existingNightKeys.size &&
      nights.every(night => existingNightKeys.has(night.getTime()))
    ) {
      const roomId = [...existingRoomIds][0];
      if (!booking.roomId || booking.roomId.toString() !== roomId) {
        await Booking.updateOne({ _id: booking._id }, { $set: { roomId } });
      }
      continue;
    }

    const candidates = booking.roomId
      ? await Room.find({ _id: booking.roomId }).select('_id').lean()
      : await Room.find({
        roomTypeId: booking.roomTypeId,
        isMaintenance: { $ne: true },
        status: { $ne: 'MAINTENANCE' }
      }).select('_id').lean();

    let reserved = false;
    for (const room of candidates) {
      try {
        if (existingReservations.length) {
          await BookingRoomNight.deleteMany({ bookingId: booking._id });
        }

        await BookingRoomNight.insertMany(
          nights.map(night => ({ roomId: room._id, night, bookingId: booking._id })),
          { ordered: true }
        );

        if (!booking.roomId || booking.roomId.toString() !== room._id.toString()) {
          await Booking.updateOne(
            { _id: booking._id },
            { $set: { roomId: room._id, checkIn: start, checkOut: end } }
          );
        }
        reserved = true;
        break;
      } catch (error) {
        await BookingRoomNight.deleteMany({ bookingId: booking._id });
        if (!isReservationConflict(error)) throw error;
      }
    }

    if (!reserved) {
      throw new Error(
        `Không thể gán phòng cho booking ${booking._id}; kiểm tra booking chồng lấn hoặc số phòng thực tế.`
      );
    }
  }
};

module.exports = migrateActiveBookings;
