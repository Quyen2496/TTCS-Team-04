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
    images: [imageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomType', roomTypeSchema);