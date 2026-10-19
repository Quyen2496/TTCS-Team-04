require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./src/config/db");

// Import các routes hiện tại
const authRoutes = require("./src/modules/auth/auth.routes");
const lookupRouter = require("./src/modules/lookup/lookup.router");
const bookingRouter = require("./src/modules/bookings/booking.router");
const roomRouter = require("./src/modules/rooms/room.router");
const receptionRouter = require("./src/modules/reception/routes");

// Import Cron Job nhắc lịch tự động
const { initReminderCron } = require("./src/jobs/reminder.job");

const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TTCS Team 04 shared API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/lookup", lookupRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/reception", receptionRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Khởi chạy Cron Job quét nhắc lịch tự động khi server chạy thành công
      initReminderCron();
      console.log("Cron Job for booking reminders has been initialized.");
    });
  })
  .catch(error => {
    console.error("Failed to initialize the database:", error);
    process.exit(1);
  });