require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const loginRouter = require("./src/modules/auth/login");
const lookupRouter = require("./src/modules/lookup/lookup.router");
const bookingRouter = require("./src/modules/bookings/booking.router");
const roomRouter = require("./src/modules/rooms/room.router");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", loginRouter);
app.use("/api/lookup", lookupRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/rooms", roomRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Chưa cấu hình MONGODB_URI trong .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Đã kết nối MongoDB");

    app.listen(PORT, HOST, () => {
      console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động server:", error.message);
    process.exit(1);
  }
}

startServer();
