const cron = require('node-cron');
const Booking = require('../modules/bookings/booking.model');
const { addEmailToQueue } = require('../services/emailQueue.service');

// Chạy mỗi giờ một lần để kiểm tra các booking sắp check-in trong ngày mai
const initReminderCron = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const nextDay = new Date(tomorrow);
      nextDay.setDate(nextDay.getDate() + 1);

      // Tìm các booking chuẩn bị check-in ngày mai
      const bookings = await Booking.find({
        checkIn: { $gte: tomorrow,$lt: nextDay },
        status: { $in: ['CONFIRMED', 'PAID'] }
      });

      for (const booking of bookings) {
        addEmailToQueue({
          to: booking.email,
          subject: `[Homestay] Nhắc nhở lịch đặt phòng mã ${booking.bookingCode}`,
          html: `<p>Xin chào ${booking.guestName}, lịch check-in của bạn sẽ diễn ra vào ngày mai. Hẹn gặp bạn tại Homestay!</p>`
        });
      }
    } catch (error) {
      console.error('Lỗi cron job nhắc lịch:', error.message);
    }
  });
};

module.exports = { initReminderCron };