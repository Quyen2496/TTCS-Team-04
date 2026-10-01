const express = require("express");

const app = express();

const PORT = 3000;
const HOST = "127.0.0.1";

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "TTCS Team 04 Backend đang hoạt động!",
        status: "OK"
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
});