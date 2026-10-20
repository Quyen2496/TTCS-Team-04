const mongoose = require('mongoose');

const emailHistorySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailHistory', emailHistorySchema);