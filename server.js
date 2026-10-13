require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/modules/auth/auth.routes");
const lookupRouter = require("./src/modules/lookup/lookup.router");
const bookingRouter = require("./src/modules/bookings/booking.router");
const roomRouter = require("./src/modules/rooms/room.router");
const receptionRouter = require("./src/modules/reception/routes");
const cancellationRouter = require("./src/modules/cancellation/cancellation.router");
const roomWarningRouter = require("./src/modules/report/roomWarning.route");
const roomBoardRouter = require("./src/modules/roomBoard/roomBoard.router");

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
app.use("/api/admin", cancellationRouter);
app.use("/api/admin/reports", roomWarningRouter);
app.use("/api/admin/room-board", roomBoardRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Cannot start server:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };