const Booking = require('./booking.model');
const mongoose = require('mongoose');
const RoomType = require('../rooms/roomType.model');
const parameters = require('../../config/booking-surcharge-parameters');

const surchargeTypes = {
  EXTRA_GUEST: {
    defaultUnitPrice: parameters.EXTRA_GUEST_UNIT_PRICE,
    label: 'Phụ thu thêm người'
  },
  EXTRA_BED: {
    defaultUnitPrice: parameters.EXTRA_BED_UNIT_PRICE,
    label: 'Phụ thu thêm giường'
  }
};

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getBookedNights = booking => {
  const checkIn = new Date(booking.checkInDate || booking.checkIn);
  const checkOut = new Date(booking.checkOutDate || booking.checkOut);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    throw httpError('Ngày nhận/trả phòng của booking không hợp lệ.', 409);
  }
  return Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000));
};

const addSurcharges = async ({ bookingId, items, actor }) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw httpError('Mã booking không hợp lệ.', 400);
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw httpError('Vui lòng gửi từ 1 đến 20 dòng phụ thu mỗi lần.');
  }

  const booking = await Booking.findById(bookingId).select(
    'roomTypeId checkIn checkOut checkInDate checkOutDate guestCount status'
  ).lean();
  if (!booking) throw httpError('Không tìm thấy booking.', 404);
  if (!['IN_HOUSE', 'CHECKED_IN'].includes(booking.status)) {
    throw httpError('Chỉ thêm phụ thu cho booking đang lưu trú.', 409);
  }

  const roomType = await RoomType.findById(booking.roomTypeId).select('capacity').lean();
  if (!roomType) throw httpError('Không tìm thấy loại phòng của booking.', 409);
  const capacity = roomType.capacity === undefined || roomType.capacity === null
    ? parameters.DEFAULT_ROOM_CAPACITY
    : Number(roomType.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw httpError('Sức chứa loại phòng chưa được cấu hình hợp lệ.', 409);
  }
  if (!Number.isInteger(booking.guestCount) || booking.guestCount < 1) {
    throw httpError('Số khách hiện tại của booking chưa hợp lệ.', 409);
  }

  const bookedNights = getBookedNights(booking);
  let additionalGuests = 0;
  const surchargeLines = items.map((item, index) => {
    if (!item || !Object.hasOwn(surchargeTypes, item.type)) {
      throw httpError(`Dòng phụ thu ${index + 1}: loại phải là EXTRA_GUEST hoặc EXTRA_BED.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw httpError(`Dòng phụ thu ${index + 1}: số lượng phải là số nguyên từ 1 đến 20.`);
    }
    if (!Number.isInteger(item.nights) || item.nights < 1 || item.nights > bookedNights) {
      throw httpError(`Dòng phụ thu ${index + 1}: số đêm phải từ 1 đến ${bookedNights}.`);
    }

    const { defaultUnitPrice, label } = surchargeTypes[item.type];
    const unitPrice = item.unitPrice === undefined ? defaultUnitPrice : Number(item.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw httpError(`Dòng phụ thu ${index + 1}: đơn giá phải là số không âm.`);
    }
    const overrideReason = typeof item.overrideReason === 'string' ? item.overrideReason.trim() : '';
    if (unitPrice !== defaultUnitPrice && !overrideReason) {
      throw httpError(`Dòng phụ thu ${index + 1}: cần nhập lý do khi sửa đơn giá mặc định.`);
    }
    const note = typeof item.note === 'string' ? item.note.trim() : '';
    if (note.length > 300 || overrideReason.length > 300) {
      throw httpError(`Dòng phụ thu ${index + 1}: ghi chú và lý do tối đa 300 ký tự.`);
    }

    if (item.type === 'EXTRA_GUEST') additionalGuests += item.quantity;
    return {
      type: item.type,
      quantity: item.quantity,
      unitPrice,
      defaultUnitPrice,
      nights: item.nights,
      note,
      overrideReason,
      addedBy: actor || '',
      addedAt: new Date(),
      label
    };
  });

  if (additionalGuests > 0 && booking.guestCount + additionalGuests > capacity) {
    throw httpError(`Tổng số khách sau khi thêm là ${booking.guestCount + additionalGuests}, vượt sức chứa tối đa ${capacity} người.`);
  }

  // The conditional update makes simultaneous requests unable to exceed capacity.
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $in: ['IN_HOUSE', 'CHECKED_IN'] },
      ...(additionalGuests > 0 ? { guestCount: { $lte: capacity - additionalGuests } } : {})
    },
    {
      $inc: { guestCount: additionalGuests },
      $push: { surcharges: { $each: surchargeLines.map(({ label, ...line }) => line) } }
    },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedBooking) {
    throw httpError('Booking vừa thay đổi hoặc đã vượt sức chứa. Hãy tải lại booking rồi thử lại.', 409);
  }

  return {
    booking: updatedBooking,
    addedSurcharges: surchargeLines.map(line => ({
      ...line,
      amount: line.quantity * line.unitPrice * line.nights
    })),
    surchargeDefaults: {
      EXTRA_GUEST: parameters.EXTRA_GUEST_UNIT_PRICE,
      EXTRA_BED: parameters.EXTRA_BED_UNIT_PRICE
    },
    capacity
  };
};

module.exports = { addSurcharges, surchargeTypes, getBookedNights };
