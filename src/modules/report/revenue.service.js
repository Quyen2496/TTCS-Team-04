const mongoose = require('mongoose');

let Booking;
try {
  Booking = require('../bookings/booking.model');
} catch (e) {
  Booking = mongoose.model('Booking');
}

const getRevenueReport = async ({ from, to, groupBy = 'day' }) => {
  // 1. Xác định khoảng thời gian
  const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = to ? new Date(to) : new Date();
  endDate.setHours(23, 59, 59, 999);

  // 2. Định dạng gom nhóm theo Ngày hay Tháng
  const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

  // 3. Pipeline Aggregate tính toán doanh thu
  const stats = await Booking.aggregate([
    {
      $match: {
        status: { $in: ['CHECKED_OUT', 'CONFIRMED', 'COMPLETED'] },
        updatedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$updatedAt' } },
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 4. Tính tổng cộng doanh thu trong khoảng thời gian
  const totalPeriodRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalBookingsCount = stats.reduce((acc, curr) => acc + curr.totalBookings, 0);

  return {
    period: {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0]
    },
    summary: {
      totalBookings: totalBookingsCount,
      totalRevenue: totalPeriodRevenue
    },
    details: stats.map(item => ({
      date: item._id,
      bookingsCount: item.totalBookings,
      revenue: item.totalRevenue
    }))
  };
};

module.exports = {
  getRevenueReport
};