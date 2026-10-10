require('dotenv').config();

const mongoose = require('mongoose');
const Booking = require('../src/modules/bookings/booking.model');
const BookingRoomNight = require('../src/modules/bookings/booking-room-night.model');
const { cancelBookingService } = require('../src/modules/bookings/booking.service');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homestay';
const CHECK_IN = '2026-11-20';
const CHECK_OUT = '2026-11-23';
const REQUEST_COUNT = 200;

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { status: response.status, body };
}

async function testConcurrentBooking() {
  await mongoose.connect(MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 5000
  });
  let createdBookingIdsToCancel = [];

  try {
    const query = new URLSearchParams({ checkIn: CHECK_IN, checkOut: CHECK_OUT, guestCount: '2' });
    const availability = await request(`/bookings/availability?${query}`);

    if (availability.status !== 200 || !Array.isArray(availability.body?.data)) {
      throw new Error(`Availability failed: HTTP ${availability.status} ${JSON.stringify(availability.body)}`);
    }

    const roomType = availability.body.data.find(item => item.availableRooms === 1);
    if (!roomType) {
      throw new Error(`No room type has exactly one available room for ${CHECK_IN} through ${CHECK_OUT}.`);
    }

    const roomTypeObjectId = new mongoose.Types.ObjectId(String(roomType.roomTypeId));
    const overlapFilter = {
      roomTypeId: roomTypeObjectId,
      checkIn: { $lt: new Date(`${CHECK_OUT}T00:00:00.000Z`) },
      checkOut: { $gt: new Date(`${CHECK_IN}T00:00:00.000Z`) }
    };
    const beforeIds = new Set((await Booking.find(overlapFilter).distinct('_id')).map(id => id.toString()));

    const payload = {
      guestName: 'Concurrent Booking Test',
      phone: '0987654321',
      email: 'test200@example.test',
      roomTypeId: String(roomType.roomTypeId),
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      guestCount: 2
    };

    console.log(`Sending ${REQUEST_COUNT} simultaneous requests for ${roomType.name} (${payload.roomTypeId})...`);

    const results = await Promise.all(Array.from({ length: REQUEST_COUNT }, async () => {
      try {
        return await request('/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        return { status: 'NETWORK_ERROR', body: error.message };
      }
    }));

    const success201 = results.filter(result => result.status === 201).length;
    const conflict409 = results.filter(result => result.status === 409 && result.body?.message === 'Hết phòng').length;
    const otherResults = results.filter(result => result.status !== 201 && result.status !== 409);
    const afterBookings = await Booking.find(overlapFilter).lean();
    const createdBookings = afterBookings.filter(booking => !beforeIds.has(booking._id.toString()));
    const createdBookingIds = createdBookings.map(booking => booking._id);
    createdBookingIdsToCancel = createdBookingIds;
    const savedNights = createdBookingIds.length
      ? await BookingRoomNight.countDocuments({ bookingId: { $in: createdBookingIds } })
      : 0;
    const expectedNightCount = Math.round(
      (new Date(`${CHECK_OUT}T00:00:00.000Z`) - new Date(`${CHECK_IN}T00:00:00.000Z`)) / (24 * 60 * 60 * 1000)
    );

    console.log(`HTTP 201: ${success201}; HTTP 409 “Hết phòng”: ${conflict409}`);
    console.log(`New booking records: ${createdBookings.length}; night reservations: ${savedNights}`);
    if (otherResults.length) {
      console.log('Unexpected responses:', JSON.stringify(otherResults.slice(0, 5), null, 2));
    }

    if (
      success201 === 1 &&
      conflict409 === REQUEST_COUNT - 1 &&
      otherResults.length === 0 &&
      createdBookings.length === 1 &&
      createdBookings[0].status === 'PENDING' &&
      createdBookings[0].roomId &&
      savedNights === expectedNightCount
    ) {
      await cancelBookingService(createdBookings[0]._id);
      const availabilityAfterCancel = await request(`/bookings/availability?${query}`);
      const restoredRoomType = availabilityAfterCancel.body?.data?.find(item =>
        String(item.roomTypeId) === payload.roomTypeId
      );
      if (availabilityAfterCancel.status !== 200 || restoredRoomType?.availableRooms !== 1) {
        throw new Error('FAIL: cancel did not immediately return the room to availability.');
      }
      createdBookingIdsToCancel = [];

      console.log('PASS: one booking owns the final room; cancellation immediately releases it.');
      return;
    }

    throw new Error('FAIL: the concurrency results or persisted room-night records do not match expectations.');
  } finally {
    for (const bookingId of createdBookingIdsToCancel) {
      try {
        await cancelBookingService(bookingId);
      } catch (error) {
        console.error(`Cleanup failed for booking ${bookingId}: ${error.message}`);
      }
    }
    await mongoose.disconnect();
  }
}

testConcurrentBooking().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
