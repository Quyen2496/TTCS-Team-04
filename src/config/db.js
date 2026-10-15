const mongoose = require("mongoose");
const BookingRoomNight = require("../modules/bookings/booking-room-night.model");
const migrateActiveBookings = require("../modules/bookings/booking-room-night.migration");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(uri);
  // Build the unique room/night index and assign legacy active bookings before
  // the HTTP server starts accepting requests.
  await BookingRoomNight.createIndexes();
  await migrateActiveBookings();
  console.log("MongoDB connected");
}

module.exports = connectDB;
