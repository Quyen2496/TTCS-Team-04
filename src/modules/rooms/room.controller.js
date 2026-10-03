const mongoose = require('mongoose');
const Room = require('./room.model');

async function getRooms(req, res) {
  try {
    const { roomTypeId, floor, status } = req.query;

    const filter = {};

    if (roomTypeId) {
      if (!mongoose.Types.ObjectId.isValid(roomTypeId)) {
        return res.status(400).json({
          message: 'roomTypeId không hợp lệ'
        });
      }

      filter.roomTypeId = roomTypeId;
    }

    if (floor !== undefined) {
      const floorNumber = Number(floor);

      if (!Number.isInteger(floorNumber) || floorNumber < 1) {
        return res.status(400).json({
          message: 'floor phải là số nguyên lớn hơn hoặc bằng 1'
        });
      }

      filter.floor = floorNumber;
    }

    if (status) {
      const allowedStatuses = [
        'CLEAN_VACANT',
        'DIRTY_VACANT',
        'OCCUPIED',
        'MAINTENANCE'
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: 'status không hợp lệ'
        });
      }

      filter.status = status;
    }

    const rooms = await Room.find(filter)
      .sort({ roomNumber: 1 })
      .lean();

    return res.status(200).json({
      data: rooms,
      total: rooms.length
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách phòng:', error);

    return res.status(500).json({
      message: 'Không thể lấy danh sách phòng'
    });
  }
}

module.exports = {
  getRooms
};
