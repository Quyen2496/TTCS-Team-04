const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homestay';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Kết nối MongoDB thành công!'))
  .catch((err) => console.error('Lỗi kết nối MongoDB:', err));

app.get('/', (req, res) => {
  res.send('<h1>Hệ thống quản lý HomeStay - TTCS Team 04</h1>');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://${process.env.HOST || '127.0.0.1'}:${PORT}`);
});
