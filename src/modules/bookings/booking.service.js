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

module.exports = {
  getAvailableRoomTypes,
  calculateQuote
};