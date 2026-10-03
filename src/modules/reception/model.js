const mongoose = require("mongoose");

const checkInSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, trim: true },
  guestName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  idNumber: { type: String, required: true, trim: true },
  guests: { type: Number, required: true, min: 1 },
  checkinDate: { type: String, required: true },
  checkoutDate: { type: String, required: true },
  status: { type: String, enum: ["reserved", "checkedIn", "checkedOut", "cancelled", "expired"], default: "reserved" },
  actualCheckinDate: { type: String, default: null },
  actualCheckoutDate: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

checkInSchema.index({ roomCode: 1, status: 1 });
checkInSchema.index({ phone: 1 });

module.exports = mongoose.model("CheckIn", checkInSchema);
