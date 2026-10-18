const { EXTRA_GUEST_UNIT_PRICE } = require('../../config/booking-surcharge-parameters');

const calculateCheckout = (booking, actualCheckOutValue = new Date()) => {
  const actualCheckOut = new Date(actualCheckOutValue);
  if (Number.isNaN(actualCheckOut.getTime())) {
    const error = new Error('Thời điểm trả phòng không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  const checkIn = new Date(booking.checkInDate || booking.checkIn);
  const checkOut = new Date(booking.checkOutDate || booking.checkOut);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    const error = new Error('Ngày nhận/trả phòng của booking không hợp lệ.');
    error.statusCode = 409;
    throw error;
  }

  const bookedNights = Math.max(1, Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000)));
  const roomType = booking.roomTypeId && typeof booking.roomTypeId === 'object' ? booking.roomTypeId : null;
  const roomPricePerNight = booking.pricePerNight ||
    (roomType && (roomType.price || roomType.basePrice)) ||
    (booking.totalAmount ? booking.totalAmount / bookedNights : 0);
  const standardGuests = (roomType && roomType.standardGuests) || 2;
  const actualGuests = booking.guestCount || 1;
  const recordedSurcharges = Array.isArray(booking.surcharges) ? booking.surcharges : [];
  const recordedExtraGuests = recordedSurcharges
    .filter(item => item.type === 'EXTRA_GUEST')
    .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const baselineExtraGuests = Math.max(0, actualGuests - standardGuests - recordedExtraGuests);

  const nightDetails = [];
  const lineItems = [];
  let totalRoomFee = 0;
  for (let index = 0; index < bookedNights; index += 1) {
    const nightDate = new Date(checkIn);
    nightDate.setDate(nightDate.getDate() + index);
    const date = nightDate.toISOString().slice(0, 10);
    nightDetails.push({ night: index + 1, date, price: roomPricePerNight });
    totalRoomFee += roomPricePerNight;
    lineItems.push({
      kind: 'ROOM_NIGHT',
      description: `Tiền phòng đêm ${index + 1} (${date})`,
      unitPrice: roomPricePerNight,
      quantity: 1,
      amount: roomPricePerNight
    });
  }

  const baselineExtraGuestSurcharge = baselineExtraGuests * EXTRA_GUEST_UNIT_PRICE * bookedNights;
  if (baselineExtraGuestSurcharge > 0) {
    lineItems.push({
      kind: 'EXTRA_GUEST',
      description: `Phụ thu ${baselineExtraGuests} khách vượt tiêu chuẩn × ${bookedNights} đêm`,
      unitPrice: EXTRA_GUEST_UNIT_PRICE,
      quantity: baselineExtraGuests * bookedNights,
      amount: baselineExtraGuestSurcharge
    });
  }

  const surchargeLineItems = recordedSurcharges.map(item => {
    const isExtraGuest = item.type === 'EXTRA_GUEST';
    const typeLabel = isExtraGuest ? 'Phụ thu thêm người' : 'Phụ thu thêm giường';
    const note = item.note ? ` — ${item.note}` : '';
    const line = {
      kind: item.type,
      description: `${typeLabel}${note}`,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      nights: item.nights,
      amount: item.quantity * item.unitPrice * item.nights,
      note: item.note || '',
      overrideReason: item.overrideReason || ''
    };
    lineItems.push(line);
    return line;
  });

  const totalAddedGuestSurcharge = surchargeLineItems
    .filter(item => item.kind === 'EXTRA_GUEST')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExtraBedSurcharge = surchargeLineItems
    .filter(item => item.kind === 'EXTRA_BED')
    .reduce((sum, item) => sum + item.amount, 0);

  let lateCheckoutSurcharge = 0;
  let lateHours = 0;
  let isOvernightCharged = false;
  const checkoutHour = actualCheckOut.getHours();
  const checkoutMinutes = actualCheckOut.getMinutes();
  if (checkoutHour > 12 || (checkoutHour === 12 && checkoutMinutes > 0)) {
    if (checkoutHour > 18 || (checkoutHour === 18 && checkoutMinutes > 0)) {
      lateCheckoutSurcharge = roomPricePerNight;
      isOvernightCharged = true;
    } else {
      lateHours = checkoutHour - 12 + (checkoutMinutes > 0 ? 1 : 0);
      lateCheckoutSurcharge = lateHours * roomPricePerNight * 0.1;
    }
  }
  if (lateCheckoutSurcharge > 0) {
    lineItems.push({
      kind: 'LATE_CHECKOUT',
      description: isOvernightCharged ? 'Phụ thu trả phòng sau 18:00 (1 đêm)' : `Phụ thu trả muộn (${lateHours} giờ)`,
      unitPrice: isOvernightCharged ? roomPricePerNight : roomPricePerNight * 0.1,
      quantity: isOvernightCharged ? 1 : lateHours,
      amount: lateCheckoutSurcharge
    });
  }

  const totalExtraGuestSurcharge = baselineExtraGuestSurcharge + totalAddedGuestSurcharge;
  const totalAmount = totalRoomFee + totalExtraGuestSurcharge + totalExtraBedSurcharge + lateCheckoutSurcharge;
  const totalDeposit = booking.totalDeposit || booking.depositAmount || 0;
  const remainingAmount = totalAmount - totalDeposit;
  const invoiceLineItems = [...lineItems];
  if (totalDeposit > 0) {
    invoiceLineItems.push({
      kind: 'DEPOSIT',
      description: 'Tiền cọc đã thanh toán',
      unitPrice: -totalDeposit,
      quantity: 1,
      amount: -totalDeposit
    });
  }

  return {
    actualCheckOut,
    bookedNights,
    isEarlyCheckout: actualCheckOut < checkOut,
    nightDetails,
    roomPricePerNight,
    actualGuests,
    standardGuests,
    capacity: roomType && roomType.capacity,
    baselineExtraGuests,
    surchargeLineItems,
    lineItems,
    invoiceLineItems,
    totalRoomFee,
    baselineExtraGuestSurcharge,
    totalExtraGuestSurcharge,
    totalAddedGuestSurcharge,
    totalExtraBedSurcharge,
    lateHours,
    isOvernightCharged,
    lateCheckoutSurcharge,
    totalAmount,
    totalDeposit,
    remainingAmount
  };
};

module.exports = { calculateCheckout };
