const Amenity = require('./amenity.model');
const RoomType = require('./roomType.model');

// 1. Lấy danh sách tiện nghi
async function getAmenities(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const amenities = await Amenity.find(filter);
    return res.status(200).json({ data: amenities });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 2. Thêm mới tiện nghi (S1-08)
async function createAmenity(req, res) {
  try {
    const { code, name, icon, status } = req.body;

    // Kiểm tra trùng mã tiện nghi
    const existingCode = await Amenity.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ message: 'Mã tiện nghi đã tồn tại' });
    }

    const newAmenity = await Amenity.create({ code, name, icon, status });
    return res.status(201).json({ message: 'Tạo tiện nghi thành công', data: newAmenity });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 3. Xóa tiện nghi (Bảo vệ không cho xóa tiện nghi đã gán cho Loại phòng) (S1-08)
async function deleteAmenity(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra tiện nghi đã được gán cho loại phòng nào chưa
    const linkedRoomType = await RoomType.findOne({ amenities: id });
    if (linkedRoomType) {
      return res.status(400).json({
        message: 'Không thể xóa tiện nghi đã được gán cho loại phòng. Vui lòng chuyển trạng thái sang INACTIVE.'
      });
    }

    const deleted = await Amenity.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy tiện nghi' });
    }

    return res.status(200).json({ message: 'Xóa tiện nghi thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// 4. Gán danh sách tiện nghi cho Loại phòng (Chống gán trùng) (S1-08)
async function assignAmenitiesToRoomType(req, res) {
  try {
    const { roomTypeId } = req.params;
    const { amenityIds } = req.body; // Mảng các ObjectId tiện nghi

    // Bỏ trùng lặp trong mảng gửi lên
    const uniqueAmenityIds = [...new Set(amenityIds)];

    const updatedRoomType = await RoomType.findByIdAndUpdate(
      roomTypeId,
      { amenities: uniqueAmenityIds },
      { new: true }
    ).populate('amenities');

    if (!updatedRoomType) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    return res.status(200).json({
      message: 'Gán tiện nghi cho loại phòng thành công',
      data: updatedRoomType
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}
module.exports = {
  getAmenities,
  createAmenity,
  deleteAmenity,
  assignAmenitiesToRoomType
};