const roomAssignmentService = require('./roomAssignment.service');

// Lấy danh sách phòng trống cho booking
exports.getAvailableRooms = async (req, res) => {
    try {
        const rooms = await roomAssignmentService.getAvailableRooms(req.params.id);
        return res.status(200).json({ success: true, data: { availableRooms: rooms } });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// Gán phòng cho booking
exports.assignRoom = async (req, res) => {
    try {
        const { roomId } = req.body;
        const booking = await roomAssignmentService.assignRoom(req.params.id, roomId);
        return res.status(200).json({ success: true, message: "Gán phòng thành công.", data: booking });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// Đổi phòng cho booking
exports.changeRoom = async (req, res) => {
    try {
        const { newRoomId, reason } = req.body;
        const booking = await roomAssignmentService.changeRoom(req.params.id, newRoomId, reason);
        return res.status(200).json({ success: true, message: "Đổi phòng thành công.", data: booking });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};