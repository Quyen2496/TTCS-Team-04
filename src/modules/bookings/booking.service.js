const mongoose = require('mongoose');
const Booking = require('./booking.model');
const BookingRoomNight = require('./booking-room-night.model');
const Room = require('../rooms/room.model');
const RoomType = require('../rooms/roomType.model');
const { getStayRange, getNights } = require('./booking-dates');
const crypto = require('crypto');

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
 * SPRINT 3: Cập nhật đơn đặt phòng (Đổi ngày / loại phòng) kèm theo giữ khóa phòng-đêm
 */
const modifyBooking = async (bookingId, updateData) => {
  const { newRoomTypeId, newCheckIn, newCheckOut, newTotalAmount } = updateData;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Không tìm thấy đơn đặt phòng.');
  }

  const checkIn = newCheckIn ? newCheckIn : booking.checkIn;
  const checkOut = newCheckOut ? newCheckOut : booking.checkOut;
  const roomTypeId = newRoomTypeId ? newRoomTypeId : booking.roomTypeId;

  const { start, end } = getStayRange(checkIn, checkOut);
  const nights = getNights(start, end);

  if (nights.length === 0) {
    throw new Error('Số đêm lưu trú phải lớn hơn 0.');
  }

  // Xóa các record room-night cũ để đổi lịch mới
  await BookingRoomNight.deleteMany({ bookingId: booking._id });

  const activeRooms = await Room.find({
    roomTypeId: roomTypeId,
    isMaintenance: { $ne: true },
    status: { $ne: 'MAINTENANCE' }
  }).select('_id').lean();

  if (!activeRooms.length) {
    throw new Error('Không còn phòng trống cho loại phòng và thời gian này.');
  }

  let assignedRoomId = null;
  for (const room of activeRooms) {
    const occupiedNights = await BookingRoomNight.countDocuments({
      roomId: room._id,
      night: { $in: nights }
    });
    if (occupiedNights === 0) {
      assignedRoomId = room._id;
      break;
    }
  }

  if (!assignedRoomId) {
    throw new Error('Phòng thuộc loại này đã kín lịch trong khoảng thời gian bạn chọn.');
  }

  const roomNightDocs = nights.map(night => ({
    bookingId: booking._id,
    roomId: assignedRoomId,
    night
  }));

  try {
    await BookingRoomNight.insertMany(roomNightDocs, { ordered: true });
  } catch (error) {
    if (isRoomNightIndexConflict(error)) {
      throw httpError('Phòng đã được đặt trong khoảng thời gian này.', 409);
    }
    throw error;
  }

  booking.roomTypeId = roomTypeId;
  booking.roomId = assignedRoomId;
  booking.checkIn = new Date(checkIn);
  booking.checkOut = new Date(checkOut);
  if (newTotalAmount !== undefined) {
    booking.totalAmount = newTotalAmount;
  }

  await booking.save();
  return booking.toObject();
};

/**
 * SPRINT 3: Đặt phòng trực tiếp tại quầy (Walk-in) kèm theo phân bổ phòng-đêm
 */
const createWalkInBooking = async (walkInData) => {
  const { guestName, phone, email, roomTypeId, checkIn, checkOut, guestCount, isPaidNow } = walkInData;

  if (!guestName || !phone || !roomTypeId || !checkIn || !checkOut) {
    throw new Error('Thiếu thông tin bắt buộc để tạo đơn khách vãng lai.');
  }

  const { start, end } = getStayRange(checkIn, checkOut);
  const nights = getNights(start, end);
  if (nights.length === 0) {
    throw new Error('Số đêm lưu trú phải lớn hơn 0.');
  }

  const quote = await calculateQuote({
    roomTypeId,
    checkIn,
    checkOut,
    quantity: 1
  });

  const activeRooms = await Room.find({
    roomTypeId: roomTypeId,
    isMaintenance: { $ne: true },
    status: { $ne: 'MAINTENANCE' }
  }).select('_id').lean();

  let assignedRoomId = null;
  for (const room of activeRooms) {
    const occupiedNights = await BookingRoomNight.countDocuments({
      roomId: room._id,
      night: { $in: nights }
    });
    if (occupiedNights === 0) {
      assignedRoomId = room._id;
      break;
    }
  }

  if (!assignedRoomId) {
    throw new Error('Không đủ phòng trống cho loại phòng này trong khoảng thời gian chọn.');
  }

  const bookingCode = 'WALK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const newBooking = new Booking({
    bookingCode,
    guestName: guestName.trim(),
    phone: phone.trim(),
    email: email ? email.trim().toLowerCase() : 'walkin@homestay.com',
    roomTypeId,
    roomId: assignedRoomId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guestCount: parseInt(guestCount, 10) || 1,
    totalAmount: quote.totalAmount,
    status: isPaidNow ? 'CONFIRMED' : 'PENDING',
    isWalkIn: true
  });

  const savedBooking = await newBooking.save();

  const roomNightDocs = nights.map(night => ({
    bookingId: savedBooking._id,
    roomId: assignedRoomId,
    night
  }));

  try {
    await BookingRoomNight.insertMany(roomNightDocs, { ordered: true });
  } catch (error) {
    await Booking.findByIdAndDelete(savedBooking._id);
    if (isRoomNightIndexConflict(error)) {
      throw httpError('Phòng đã được đặt trong khoảng thời gian này.', 409);
    }
    throw error;
  }

  return savedBooking;
};

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  getAvailableRoomTypes,
  calculateQuote,
  calculateModificationQuote,
  modifyBooking,
  createWalkInBooking
};