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

app.listen(PORT, HOST, () => {
    console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
});