require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/homestay";

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("Đã kết nối MongoDB.");
    console.log("Seed dữ liệu thành công!");

    await mongoose.connection.close();
    console.log("Đã đóng kết nối MongoDB.");
  } catch (error) {
    console.error("Seed thất bại:", error.message);
    process.exit(1);
  }
}

seed();