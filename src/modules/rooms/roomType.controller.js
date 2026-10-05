const RoomType = require('./roomType.model');
const Room = require('./room.model');

// 1. Lấy danh sách loại phòng
async function getRoomTypes(req, res) {
  try {
    const roomTypes = await RoomType.find().populate('amenities');
    return res.status(200).json({ data: roomTypes });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 2. Thêm Loại phòng mới (S1-06)
async function createRoomType(req, res) {
  try {
    const { code, name, standardCapacity, maxCapacity, bedInfo, description, status } = req.body;

    // Kiểm tra maxCapacity >= standardCapacity
    if (Number(maxCapacity) < Number(standardCapacity)) {
      return res.status(400).json({
        message: 'Sức chứa tối đa không được nhỏ hơn sức chứa tiêu chuẩn'
      });
    }

    // Kiểm tra trùng mã code
    const existingCode = await RoomType.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ message: 'Mã loại phòng đã tồn tại trên hệ thống' });
    }

    const newRoomType = await RoomType.create({
      code,
      name,
      standardCapacity,
      maxCapacity,
      bedInfo,
      description,
      status
    });

    return res.status(201).json({ message: 'Tạo loại phòng thành công', data: newRoomType });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 3. Cập nhật loại phòng
async function updateRoomType(req, res) {
  try {
    const { id } = req.params;
    const { name, standardCapacity, maxCapacity, bedInfo, description, status } = req.body;

    if (maxCapacity !== undefined && standardCapacity !== undefined) {
      if (Number(maxCapacity) < Number(standardCapacity)) {
        return res.status(400).json({
          message: 'Sức chứa tối đa không được nhỏ hơn sức chứa tiêu chuẩn'
        });
      }
    }

    const updated = await RoomType.findByIdAndUpdate(
      id,
      { name, standardCapacity, maxCapacity, bedInfo, description, status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    return res.status(200).json({ message: 'Cập nhật loại phòng thành công', data: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 4. Xóa Loại phòng (Bảo vệ không cho xóa nếu có phòng vật lý gắn vào) (S1-06)
async function deleteRoomType(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra xem có phòng vật lý nào đang gắn loại phòng này không
    const linkedRoom = await Room.findOne({ roomTypeId: id });
    if (linkedRoom) {
      return res.status(400).json({
        message: 'Không thể xóa loại phòng đang có phòng vật lý gắn vào. Vui lòng chuyển sang Ngừng bán.'
      });
    }

    const deleted = await RoomType.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    return res.status(200).json({ message: 'Xóa loại phòng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType
};