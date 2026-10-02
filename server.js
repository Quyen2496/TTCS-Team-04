feature/t3-quynh-booking-lookup-api
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// 1. Cấu hình middleware đọc dữ liệu JSON từ body (Tránh lỗi req.body undefined)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Cấu hình kết nối MongoDB với database homestay của nhóm
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homestay';

mongoose.connect(MONGO_URI)
  .then(() => console.log(' Connect MongoDB thành công!'))
  .catch((err) => console.error(' Lỗi kết nối MongoDB:', err));

// 3. Đăng ký Router tra cứu booking
const lookupRouter = require('./src/modules/lookup/lookup.router');
app.use('/api/lookup', lookupRouter);

const express = require("express");
const path = require("path");

const app = express();
const loginRouter = require("./src/modules/auth/login");
const PORT = 3000;
const HOST = "127.0.0.1";

app.use(express.json());
app.use("/api/auth", loginRouter);
// Phục vụ các file frontend trong thư mục public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
develop

// 4. Lắng nghe trên cổng 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server đang chạy tại http://localhost:${PORT}`);
});