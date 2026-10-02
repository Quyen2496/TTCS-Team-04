const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

// Middleware đọc dữ liệu JSON gửi lên
app.use(express.json());

// Nhập tuyến đường API của booking (Module của Phú & Quý)
const bookingRouter = require('./src/modules/bookings/booking.router');
app.use('/api/bookings', bookingRouter);

// Trang chủ kiểm tra trạng thái Server
app.get("/", (req, res) => {
  res.json({
    message: "TTCS Team 04 Backend đang hoạt động!",
    status: "OK"
  });
});

// Khởi chạy Server
app.listen(PORT, HOST, () => {
  console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
});