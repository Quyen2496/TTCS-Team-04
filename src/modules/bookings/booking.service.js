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
 * SPRINT 3: Tính chênh lệch giá khi sửa đặt phòng
 */
const calculateModificationQuote = async ({ bookingId, newRoomTypeId, newCheckIn, newCheckOut }) => {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) {
    throw new Error('Không tìm thấy đơn đặt phòng.');
  }

  const roomTypeId = newRoomTypeId || booking.roomTypeId;
  const checkIn = newCheckIn || booking.checkIn;
  const checkOut = newCheckOut || booking.checkOut;

  const newQuote = await calculateQuote({
    roomTypeId,
    checkIn,
    checkOut,
    quantity: booking.quantity || 1
  });

  const priceDifference = newQuote.totalAmount - (booking.totalAmount || 0);

  return {
    oldTotalAmount: booking.totalAmount || 0,
    newTotalAmount: newQuote.totalAmount,
    priceDifference,
    newQuoteDetails: newQuote
  };
};

/**
 * SPRINT 3: Cập nhật đơn đặt phòng
 */
const modifyBooking = async (bookingId, updateData) => {
  const { newRoomTypeId, newCheckIn, newCheckOut, newTotalAmount } = updateData;

  const updateFields = {};
  if (newRoomTypeId) updateFields.roomTypeId = newRoomTypeId;
  if (newCheckIn) updateFields.checkIn = new Date(newCheckIn);
  if (newCheckOut) updateFields.checkOut = new Date(newCheckOut);
  if (newTotalAmount !== undefined) updateFields.totalAmount = newTotalAmount;

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: updateFields },
    { new: true }
  ).lean();

  if (!updatedBooking) {
    throw new Error('Không thể cập nhật đơn đặt phòng.');
  }

  return updatedBooking;
};

/**
 * SPRINT 3: Đặt phòng trực tiếp tại quầy (Walk-in)
 */
const createWalkInBooking = async (walkInData) => {
  const { guestName, phone, email, roomTypeId, checkIn, checkOut, guestCount, isPaidNow } = walkInData;

  if (!guestName || !phone || !roomTypeId || !checkIn || !checkOut) {
    throw new Error('Thiếu thông tin bắt buộc để tạo đơn khách vãng lai.');
  }

  const quote = await calculateQuote({
    roomTypeId,
    checkIn,
    checkOut,
    quantity: 1
  });

  const bookingCode = 'WALK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const newBooking = new Booking({
    bookingCode,
    guestName: guestName.trim(),
    phone: phone.trim(),
    email: email ? email.trim().toLowerCase() : 'walkin@homestay.com',
    roomTypeId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guestCount: parseInt(guestCount, 10) || 1,
    totalAmount: quote.totalAmount,
    status: isPaidNow ? 'CONFIRMED' : 'PENDING',
    isWalkIn: true
  });

  return await newBooking.save();
};

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  getAvailableRoomTypes,
  calculateQuote,
  calculateModificationQuote,
  modifyBooking,
  createWalkInBooking
};
