const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true
    },

    floor: {
      type: Number,
      required: true,
      min: 1
    },

    status: {
      type: String,
      enum: ['CLEAN_VACANT', 'DIRTY_VACANT', 'OCCUPIED', 'MAINTENANCE'],
      default: 'CLEAN_VACANT'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Room', roomSchema);
