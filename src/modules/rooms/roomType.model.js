const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    standardCapacity: { type: Number, required: true, min: 1 },
    maxCapacity: { type: Number, required: true, min: 1 },
    bedInfo: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'STOP_SELLING'], default: 'ACTIVE' },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomType', roomTypeSchema);``