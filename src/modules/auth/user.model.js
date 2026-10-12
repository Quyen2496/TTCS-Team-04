const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ['customer', 'staff', 'admin'],
      default: 'customer'
    },

    resetPasswordOtp: {
  type: String,
  default: null
},

resetPasswordOtpExpires: {
  type: Date,
  default: null
}  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);