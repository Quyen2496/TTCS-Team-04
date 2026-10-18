const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  thumbUrl: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
});

const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isSelling: { type: Boolean, default: true },
    // Maximum number of guests allowed in rooms of this type.
    capacity: { type: Number, min: 1, default: 4 },
    standardGuests: {
      type: Number,
      min: 1,
      default: 2,
      validate: {
        validator(value) { return !this.capacity || value <= this.capacity; },
        message: 'standardGuests cannot exceed room capacity'
      }
    },
    images: [imageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomType', roomTypeSchema);
