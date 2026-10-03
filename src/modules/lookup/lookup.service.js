const mongoose = require('mongoose');

exports.findBookingByCodeAndEmail = async (bookingCode, email) => {
  const cleanCode = bookingCode.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  // Kiểm tra xem Mongoose đã kết nối Database chưa
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error("Chưa kết nối tới Cơ sở dữ liệu MongoDB (Mongoose connection is not ready).");
  }

  // Lấy collection 'bookings'
  const booking = await mongoose.connection.db.collection('bookings').findOne({
    bookingCode: cleanCode,
    email: cleanEmail
  });

  return booking;
};