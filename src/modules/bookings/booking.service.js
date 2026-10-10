const mongoose = require('mongoose');
const Booking = require('./booking.model');
const BookingRoomNight = require('./booking-room-night.model');
const Room = require('../rooms/room.model');
const RoomType = require('../rooms/roomType.model');
const { getStayRange, getNights } = require('./booking-dates');

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'];

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isDuplicateKey = error => {
  const candidates = [
    error,
    ...(error?.writeErrors || []).map(writeError => writeError.err || writeError),
    ...(error?.result?.getWriteErrors?.() || [])
  ];

  return candidates.some(candidate =>
    candidate?.code === 11000 || candidate?.code === 112 || candidate?.codeName === 'WriteConflict'
  );
};

const isRoomNightIndexConflict = error => {
  const candidates = [
    error,
    ...(error?.writeErrors || []).map(writeError => writeError.err || writeError),
    ...(error?.result?.getWriteErrors?.() || [])
  ];

  return candidates.some(candidate => {
    if (candidate?.code !== 11000) return false;
    const pattern = candidate.keyPattern || {};
    return (pattern.roomId === 1 && pattern.night === 1) ||
      candidate.message?.includes('room_night_unique') ||
      candidate.message?.includes('roomId_1_night_1');
  });
};

/** Return room types that have at least one free physical room for every night. */
const getAvailableRoomTypes = async ({ checkIn, checkOut, guestCount }) => {
  const { start, end } = getStayRange(checkIn, checkOut);
  const parsedGuestCount = parseInt(guestCount, 10) || 1;
  const allRoomTypes = await RoomType.find({}).lean();

  if (!allRoomTypes.length) return [];

  const eligibleRoomTypes = allRoomTypes.filter(roomType =>
    roomType.capacity === undefined || roomType.capacity >= parsedGuestCount
  );
  const eligibleTypeIds = eligibleRoomTypes.map(roomType => roomType._id);
  const activeRooms = await Room.find({
    roomTypeId: { $in: eligibleTypeIds },
    isMaintenance: { $ne: true },
    status: { $ne: 'MAINTENANCE' }
  }).select('_id roomTypeId').lean();

  const roomIds = activeRooms.map(room => room._id);
  const occupiedRoomIds = roomIds.length
    ? new Set((await BookingRoomNight.distinct('roomId', {
      roomId: { $in: roomIds },
      night: { $gte: start, $lt: end }
    })).map(id => id.toString()))
    : new Set();

  const availableCountMap = new Map();
  for (const room of activeRooms) {
    const typeId = room.roomTypeId.toString();
    if (!occupiedRoomIds.has(room._id.toString())) {
      availableCountMap.set(typeId, (availableCountMap.get(typeId) || 0) + 1);
    }
  }

  return eligibleRoomTypes
    .map(roomType => ({
      roomTypeId: roomType._id,
      name: roomType.name || roomType.title || 'Loại phòng',
      capacity: roomType.capacity || parsedGuestCount,
      description: roomType.description || '',
      images: roomType.images || [],
      basePrice: roomType.basePrice || roomType.price || 0,
      availableRooms: availableCountMap.get(roomType._id.toString()) || 0
    }))
    .filter(roomType => roomType.availableRooms > 0);
};

/** Calculate the quote using calendar nights in the half-open stay interval. */
const calculateQuote = async ({ roomTypeId, checkIn, checkOut, quantity = 1 }) => {
  const { start, end } = getStayRange(checkIn, checkOut);
  const totalNights = getNights(start, end).length;
  let roomType = null;

  if (roomTypeId && mongoose.Types.ObjectId.isValid(roomTypeId)) {
    roomType = await RoomType.findById(roomTypeId).lean();
  }

  const pricePerNight = roomType ? (roomType.basePrice || roomType.price || 500000) : 500000;
  const roomTypeName = roomType ? (roomType.name || roomType.title || 'Loại phòng') : 'Phòng Deluxe';
  const numRooms = parseInt(quantity, 10) || 1;

  return {
    roomTypeId: roomType ? roomType._id : roomTypeId,
    roomTypeName,
    pricePerNight,
    totalNights,
    quantity: numRooms,
    totalAmount: pricePerNight * totalNights * numRooms
  };
};

/**
 * Reserve all calendar nights and save the booking in one MongoDB transaction.
 * The unique (roomId, night) index is the final concurrency guard; the initial
 * availability lookup is only advisory.
 */
const createBookingService = async bookingData => {
  const { roomTypeId } = bookingData;
  const { start, end } = getStayRange(bookingData.checkIn, bookingData.checkOut);
  const nights = getNights(start, end);

  if (!mongoose.Types.ObjectId.isValid(roomTypeId)) {
    throw httpError('Loại phòng không hợp lệ.', 400);
  }

  const rooms = await Room.find({
    roomTypeId,
    isMaintenance: { $ne: true },
    status: { $ne: 'MAINTENANCE' }
  }).select('_id').lean();

  const bookingId = new mongoose.Types.ObjectId();
  for (const room of rooms) {
    const session = await mongoose.startSession();
    let newBooking;

    try {
      await session.withTransaction(async () => {
        try {
          await BookingRoomNight.insertMany(
            nights.map(night => ({ roomId: room._id, night, bookingId })),
            { session, ordered: true }
          );
        } catch (error) {
          if (isDuplicateKey(error)) error.roomNightConflict = true;
          throw error;
        }

        newBooking = new Booking({
          ...bookingData,
          _id: bookingId,
          roomId: room._id,
          checkIn: start,
          checkOut: end,
          status: bookingData.status || 'PENDING'
        });
        await newBooking.save({ session });
      });

      return newBooking;
    } catch (error) {
      if (!error.roomNightConflict && !isRoomNightIndexConflict(error)) throw error;
    } finally {
      await session.endSession();
    }
  }

  throw httpError('Hết phòng', 409);
};

/** Cancel and release every reserved night atomically. */
const cancelBookingService = async bookingId => {
  const session = await mongoose.startSession();
  let booking;

  try {
    await session.withTransaction(async () => {
      booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw httpError('Không tìm thấy thông tin đặt phòng.', 404);

      booking.status = 'CANCELLED';
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { status: 'CANCELLED' } },
        { session }
      );
      await BookingRoomNight.deleteMany({ bookingId: booking._id }, { session });
    });

    return booking;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  getAvailableRoomTypes,
  calculateQuote,
  createBookingService,
  cancelBookingService
};
