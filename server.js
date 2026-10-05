require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const receptionRoutes = require("./src/modules/reception/routes");
const roomRoutes = require("./src/modules/rooms/room.router");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TTCS Team 04 Reception API is running"
  });
});

app.use("/api/reception", receptionRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (req, res) => res.sendFile(require("path").join(process.cwd(), "public", "index.html")));
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

async function start() {
  await connectDB();
  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

start();