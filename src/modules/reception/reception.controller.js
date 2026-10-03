const Room = require("./reception.model");

// GET /api/reception/rooms
async function getRooms(req, res) {
    try {
        const rooms = await Room.find().sort({
            floor: 1,
            roomNumber: 1
        });

        return res.status(200).json({
            success: true,
            data: rooms
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Không thể lấy danh sách phòng",
            error: error.message
        });
    }
}


// GET /api/reception/rooms/:id
async function getRoomById(req, res) {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phòng"
            });
        }

        return res.status(200).json({
            success: true,
            data: room
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message
        });
    }
}


// PATCH /api/reception/rooms/:id/status
async function updateRoomStatus(req, res) {
    try {
        const { status, changedBy } = req.body;

        const allowedStatuses = [
            "empty_clean",
            "empty_dirty",
            "occupied",
            "maintenance"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Trạng thái phòng không hợp lệ"
            });
        }

        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phòng"
            });
        }

        // Không cho phòng đang ở chuyển thẳng sang bảo trì
        if (
            room.status === "occupied" &&
            status === "maintenance"
        ) {
            return res.status(400).json({
                success: false,
                message: "Không thể đưa phòng đang ở vào bảo trì"
            });
        }

        const oldStatus = room.status;

        room.status = status;

        room.statusHistory.push({
            oldStatus,
            newStatus: status,
            changedBy: changedBy || "reception",
            changedAt: new Date()
        });

        await room.save();

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái phòng thành công",
            data: room
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Không thể cập nhật trạng thái phòng",
            error: error.message
        });
    }
}


// POST /api/reception/rooms/:id/maintenance
async function setMaintenance(req, res) {
    try {
        const {
            reason,
            startDate,
            endDate,
            changedBy
        } = req.body;

        if (!reason || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Bắt buộc nhập lý do và khoảng thời gian bảo trì"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Ngày bảo trì không hợp lệ"
            });
        }

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: "Ngày bắt đầu không được lớn hơn ngày kết thúc"
            });
        }

        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phòng"
            });
        }

        if (room.status === "occupied") {
            return res.status(400).json({
                success: false,
                message: "Không thể bảo trì phòng đang có khách"
            });
        }

        const oldStatus = room.status;

        room.status = "maintenance";

        room.maintenance = {
            reason,
            startDate: start,
            endDate: end
        };

        room.statusHistory.push({
            oldStatus,
            newStatus: "maintenance",
            changedBy: changedBy || "reception",
            changedAt: new Date()
        });

        await room.save();

        return res.status(200).json({
            success: true,
            message: "Đưa phòng vào bảo trì thành công",
            data: room
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Không thể cập nhật bảo trì",
            error: error.message
        });
    }
}


module.exports = {
    getRooms,
    getRoomById,
    updateRoomStatus,
    setMaintenance
};