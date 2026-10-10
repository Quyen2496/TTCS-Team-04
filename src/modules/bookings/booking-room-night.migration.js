const mongoose = require('mongoose');
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

const migrateActiveBookings = async () => {
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
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (existingReservations.length) {
            await BookingRoomNight.deleteMany({ bookingId: booking._id }, { session });
          }

          await BookingRoomNight.insertMany(
            nights.map(night => ({ roomId: room._id, night, bookingId: booking._id })),
            { session, ordered: true }
          );

          if (!booking.roomId || booking.roomId.toString() !== room._id.toString()) {
            await Booking.updateOne(
              { _id: booking._id },
              { $set: { roomId: room._id, checkIn: start, checkOut: end } },
              { session }
            );
          }
        });
        reserved = true;
        break;
      } catch (error) {
        if (!isReservationConflict(error)) throw error;
      } finally {
        await session.endSession();
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
