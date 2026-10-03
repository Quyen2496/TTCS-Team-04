const mongoose = require("mongoose");

async function connectDB() {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        throw new Error("Thiếu biến môi trường MONGODB_URI");
    }

    try {
        await mongoose.connect(mongoURI);
        console.log("Đã kết nối MongoDB.");
    } catch (error) {
        console.error("Kết nối MongoDB thất bại:", error.message);
        throw error;
    }
}

module.exports = connectDB;