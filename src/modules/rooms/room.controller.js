const mongoose = require('mongoose');
const Room = require('./room.model');
const RoomType = require('./roomType.model');
   require('./amenity.model');

const ALLOWED_STATUSES = [
  'CLEAN_VACANT',
  'DIRTY_VACANT',
  'OCCUPIED',
  'MAINTENANCE'
];

// 1. Lấy danh sách phòng + lọc
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
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          message: 'status không hợp lệ'
        });
      }

      filter.status = status;
    }

    const rooms = await Room.find(filter)
      .populate('roomTypeId', 'code name')
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

// 2. Thêm phòng
async function createRoom(req, res) {
  try {
    const {
      roomNumber,
      roomTypeId,
      floor,
      status
    } = req.body;

    // Kiểm tra số phòng
    if (!roomNumber || !String(roomNumber).trim()) {
      return res.status(400).json({
        message: 'Số phòng là bắt buộc'
      });
    }

    // Kiểm tra roomTypeId
    if (!roomTypeId || !mongoose.Types.ObjectId.isValid(roomTypeId)) {
      return res.status(400).json({
        message: 'Loại phòng không hợp lệ'
      });
    }

    // Kiểm tra loại phòng có tồn tại
    const roomType = await RoomType.findById(roomTypeId);

    if (!roomType) {
      return res.status(400).json({
        message: 'Loại phòng không tồn tại'
      });
    }

    // Kiểm tra tầng
    const floorNumber = Number(floor);

    if (!Number.isInteger(floorNumber) || floorNumber < 1) {
      return res.status(400).json({
        message: 'Tầng phải là số nguyên lớn hơn hoặc bằng 1'
      });
    }

    // Kiểm tra trạng thái
    const roomStatus = status || 'CLEAN_VACANT';

    if (!ALLOWED_STATUSES.includes(roomStatus)) {
      return res.status(400).json({
        message: 'Trạng thái phòng không hợp lệ'
      });
    }

    // Kiểm tra số phòng trùng
    const existingRoom = await Room.findOne({
      roomNumber: String(roomNumber).trim()
    });

    if (existingRoom) {
      return res.status(400).json({
        message: 'Số phòng đã tồn tại trong hệ thống'
      });
    }

    const newRoom = await Room.create({
      roomNumber: String(roomNumber).trim(),
      roomTypeId,
      floor: floorNumber,
      status: roomStatus
    });

    const result = await Room.findById(newRoom._id)
      .populate('roomTypeId', 'code name');

    return res.status(201).json({
      message: 'Tạo phòng thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi tạo phòng:', error);

    // Phòng trường hợp MongoDB vẫn bắt lỗi unique
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Số phòng đã tồn tại trong hệ thống'
      });
    }

    return res.status(500).json({
      message: 'Không thể tạo phòng'
    });
  }
}

// 3. Cập nhật phòng
async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const {
      roomNumber,
      roomTypeId,
      floor,
      status
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID phòng không hợp lệ'
      });
    }

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        message: 'Không tìm thấy phòng'
      });
    }

    // Nếu cập nhật loại phòng
    if (roomTypeId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(roomTypeId)) {
        return res.status(400).json({
          message: 'Loại phòng không hợp lệ'
        });
      }

      const roomType = await RoomType.findById(roomTypeId);

      if (!roomType) {
        return res.status(400).json({
          message: 'Loại phòng không tồn tại'
        });
      }

      room.roomTypeId = roomTypeId;
    }

    // Nếu cập nhật số phòng
    if (roomNumber !== undefined) {
      const newRoomNumber = String(roomNumber).trim();

      if (!newRoomNumber) {
        return res.status(400).json({
          message: 'Số phòng không được để trống'
        });
      }

      const duplicateRoom = await Room.findOne({
        roomNumber: newRoomNumber,
        _id: { $ne: id }
      });

      if (duplicateRoom) {
        return res.status(400).json({
          message: 'Số phòng đã tồn tại trong hệ thống'
        });
      }

      room.roomNumber = newRoomNumber;
    }

    // Nếu cập nhật tầng
    if (floor !== undefined) {
      const floorNumber = Number(floor);

      if (!Number.isInteger(floorNumber) || floorNumber < 1) {
        return res.status(400).json({
          message: 'Tầng phải là số nguyên lớn hơn hoặc bằng 1'
        });
      }

      room.floor = floorNumber;
    }

    // Nếu cập nhật trạng thái
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          message: 'Trạng thái phòng không hợp lệ'
        });
      }

      room.status = status;
    }

    await room.save();

    const result = await Room.findById(room._id)
      .populate('roomTypeId', 'code name');

    return res.status(200).json({
      message: 'Cập nhật phòng thành công',
      data: result
    });
  } catch (error) {
    console.error('Lỗi cập nhật phòng:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Số phòng đã tồn tại trong hệ thống'
      });
    }

    return res.status(500).json({
      message: 'Không thể cập nhật phòng'
    });
  }
}

// 4. Xóa phòng
async function deleteRoom(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID phòng không hợp lệ'
      });
    }

    const deletedRoom = await Room.findByIdAndDelete(id);

    if (!deletedRoom) {
      return res.status(404).json({
        message: 'Không tìm thấy phòng'
      });
    }

    return res.status(200).json({
      message: 'Xóa phòng thành công'
    });
  } catch (error) {
    console.error('Lỗi xóa phòng:', error);

    return res.status(500).json({
      message: 'Không thể xóa phòng'
    });
  }
}

module.exports = {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
};