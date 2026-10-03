require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const loginRouter = require("./src/modules/auth/login");
const lookupRouter = require("./src/modules/lookup/lookup.router");
const bookingRouter = require("./src/modules/bookings/booking.router");
const roomRouter = require("./src/modules/rooms/room.router");
const receptionRouter = require("./src/modules/reception/routes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "TTCS Team 04 shared API is running" });
});

app.use("/api/auth", loginRouter);
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

async function start() {
  await connectDB();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  return app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Cannot start server:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start };
