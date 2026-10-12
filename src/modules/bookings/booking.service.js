const mongoose = require('mongoose');
const Booking = require('./booking.model');
const RoomModule = require('../rooms/room.model');
const crypto = require('crypto');

const Room = RoomModule.Room || RoomModule;
const RoomType = RoomModule.RoomType || RoomModule;

/**
 * S2-05: Tìm loại phòng trống theo checkIn, checkOut, guestCount
 */
const getAvailableRoomTypes = async ({ checkIn, checkOut, guestCount }) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Ngày nhận hoặc trả phòng không đúng định dạng.');
  }
  if (start >= end) {
    throw new Error('Ngày trả phòng phải sau ngày nhận phòng.');
  }

  const parsedGuestCount = parseInt(guestCount, 10) || 1;
  const allRoomTypes = await RoomType.find({}).lean();

  if (!allRoomTypes || allRoomTypes.length === 0) {
    return [];
  }

  const eligibleRoomTypes = allRoomTypes.filter(rt => {
    if (rt.capacity !== undefined) {
      return rt.capacity >= parsedGuestCount;
    }
    return true;
  });

  const eligibleTypeIds = eligibleRoomTypes.map(rt => rt._id);

  const activeRooms = await Room.find({
    $or: [
      { roomTypeId: { $in: eligibleTypeIds } },
      { roomType: { $in: eligibleTypeIds } }
    ],
    isMaintenance: { $ne: true },
    status: { $ne: 'MAINTENANCE' }
  }).lean();

  const overlappingBookings = await Booking.find({
    status: { $in: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'] },
    $and: [
      { checkIn: { $lt: end } },
      { checkOut: { $gt: start } }
    ]
  }).select('roomId roomTypeId').lean();

  const occupiedRoomIds = new Set(
    overlappingBookings
      .filter(b => b.roomId)
      .map(b => b.roomId.toString())
  );

  const availableCountMap = {};
  activeRooms.forEach(room => {
    const rId = room._id.toString();
    const rtId = (room.roomTypeId || room.roomType || '').toString();

    if (rtId && !occupiedRoomIds.has(rId)) {
      availableCountMap[rtId] = (availableCountMap[rtId] || 0) + 1;
    }
  });

  return eligibleRoomTypes
    .map(rt => {
      const remainingRooms = availableCountMap[rt._id.toString()] || 0;
      return {
        roomTypeId: rt._id,
        name: rt.name || rt.title || 'Loại phòng',
        capacity: rt.capacity || parsedGuestCount,
        description: rt.description || '',
        images: rt.images || [],
        basePrice: rt.basePrice || rt.price || 0,
        availableRooms: remainingRooms
      };
    })
    .filter(item => item.availableRooms > 0);
};

/**
 * S2-06: Tính báo giá đặt phòng
 */
const calculateQuote = async ({ roomTypeId, checkIn, checkOut, quantity = 1 }) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Ngày nhận hoặc trả phòng không đúng định dạng.');
  }
  if (start >= end) {
    throw new Error('Ngày trả phòng phải sau ngày nhận phòng.');
  }

  const diffTime = Math.abs(end - start);
  const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (totalNights <= 0) {
    throw new Error('Số đêm lưu trú phải lớn hơn 0.');
  }

  let roomType = null;
  try {
    if (roomTypeId) {
      roomType = await RoomType.findById(roomTypeId).lean();
    }
  } catch (e) {}

  const pricePerNight = roomType ? (roomType.basePrice || roomType.price || 500000) : 500000;
  const roomTypeName = roomType ? (roomType.name || roomType.title || 'Loại phòng') : 'Phòng Deluxe';
  const numRooms = parseInt(quantity, 10) || 1;
  const totalAmount = pricePerNight * totalNights * numRooms;

  return {
    roomTypeId: roomType ? roomType._id : roomTypeId,
    roomTypeName,
    pricePerNight,
    totalNights,
    quantity: numRooms,
    totalAmount
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
  getAvailableRoomTypes,
  calculateQuote,
  calculateModificationQuote,
  modifyBooking,
  createWalkInBooking
};