const mongoose = require('mongoose');

const bookingRoomNightSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    night: { type: Date, required: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// MongoDB has no range exclusion constraint. One unique row per room/night
// enforces the same no-overlap rule for calendar-night bookings at DB level.
bookingRoomNightSchema.index(
  { roomId: 1, night: 1 },
  { unique: true, name: 'room_night_unique' }
);
bookingRoomNightSchema.index({ bookingId: 1 }, { name: 'booking_nights' });

module.exports = mongoose.model('BookingRoomNight', bookingRoomNightSchema);
