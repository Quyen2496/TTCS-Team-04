'use strict';

const bcrypt = require('bcryptjs');
const D = require('./domain');
const Pricing = require('./pricing');
const S = require('./settlement');

function createDemo(anchor = D.today()) {
  if (!D.day(anchor)) throw new Error('Ngày seed không hợp lệ.');
  
  const s = D.seedData();
  const h = s.homestays[0];
  h.name = 'Homestay Việt • Nghiệm thu';
  h.address = 'Thái Nguyên';
  
  // 1. Giữ đúng 4 loại phòng theo yêu cầu Sprint 4
  s.roomTypes = s.roomTypes.slice(0, 4);
  
  // 2. Đảm bảo lọc đủ 20 phòng thuộc 4 loại phòng trên
  if (s.rooms) {
    const allowedTypeIds = new Set(s.roomTypes.map(rt => String(rt._id)));
    s.rooms = s.rooms.filter(r => allowedTypeIds.has(String(r.roomTypeId))).slice(0, 20);
  }

  s.demoDataset = {
    version: 'sprint4-v1',
    anchor,
    warning: 'Dữ liệu riêng để nghiệm thu, không dùng cho vận hành'
  };

  // Mật khẩu mẫu đã băm
  const password = bcrypt.hashSync('Quy@123456', 10);
  
  // Cập nhật tài khoản cho các vai trò
  const defaultUsers = [
    ['admin', 'admin'],
    ['staff', 'staff'],
    ['receptionist', 'receptionist'],
    ['manager', 'manager']
  ];
  if (s.users && Array.isArray(s.users)) {
    for (const [username, role] of defaultUsers) {
      const u = s.users.find(x => x.username === username);
      if (u) {
        u.password = password;
        u.role = role;
      }
    }
  }

  const month = new Date(anchor + 'T00:00:00Z');

  // 3. Seed 30 booking trên 3 tháng (m = -2, -1, 0, mỗi tháng 10 booking)
  for (let m = -2; m <= 0; m++) {
    for (let j = 0; j < 10; j++) {
      const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + m, 1 + j * 2)).toISOString().slice(0, 10);
      const end = D.add(date, 2);
      
      const nightlyPrices = [0, 1].map(i => ({
        ...Pricing.resolveNight(s, s.roomTypes[j % 4], D.add(date, i)),
        extraGuestCount: 0,
        extraBedCount: 0
      }));
      
      const total = nightlyPrices.reduce((n, x) => n + (x.basePrice || 0), 0);
      
      // ĐIỂM SỬA QUAN TRỌNG: Chuyển 'CHECKED_OUT' thành 'CLOSED' để tương thích với S4-03 (cấp số hoá đơn)
      const status = end < anchor 
        ? (j === 8 ? 'CANCELLED' : 'CLOSED') 
        : (date <= anchor && end > anchor ? 'CHECKED_IN' : 'CONFIRMED');

      const b = {
        _id: D.id(),
        bookingCode: 'QA' + String((m + 2) * 10 + j + 1).padStart(6, '0'),
        homestayId: h._id,
        homestayName: h.name,
        checkIn: date,
        checkOut: end,
        status: status,
        totalAmount: total
      };

      s.bookings.push(b);
      if (typeof S.upgrade === 'function') S.upgrade(s);

      if (status === 'CHECKED_IN') {
        b.actualCheckIn = date + 'T07:00:00.00Z';
        if (typeof S.preview === 'function') {
          S.preview(s, b.bookingCode);
        }
      }
    }
  }

  const todayBooking = s.bookings.find(b => b.checkIn <= anchor && b.checkOut > anchor && b.status === 'CONFIRMED');
  s.pricingCalendar = s.pricingCalendar || {};
  s.pricingCalendar[anchor] = { kind: 'EVENT', name: 'Ngày nghiệm thu', prices: {} };
  s.emailJobs = [];
  s.schedulerRuns = [];

  return s;
}

module.exports = { createDemo };