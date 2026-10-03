require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "TTCS Team 04 Backend đang hoạt động!",
        status: "OK"
    });
});

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, HOST, () => {
            console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error("Không thể khởi động server:", error.message);
        process.exit(1);
    }
}

startServer();