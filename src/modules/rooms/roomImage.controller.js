const RoomType = require('./roomType.model');

exports.uploadImages = async (req, res) => {
  try {
    const { roomTypeId } = req.params;
    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });

    if (roomType.images.length + req.processedImages.length > 8) {
      return res.status(400).json({ message: 'Mỗi loại phòng tối đa chỉ được lưu 8 ảnh trên server!' });
    }

    const startOrder = roomType.images.length;
    const newImages = req.processedImages.map((img, index) => ({
      ...img,
      order: startOrder + index,
      isPrimary: roomType.images.length === 0 && index === 0
    }));

    roomType.images.push(...newImages);
    await roomType.save();

    res.status(200).json({ message: 'Upload ảnh thành công', images: roomType.images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reorderImages = async (req, res) => {
  try {
    const { roomTypeId } = req.params;
    const { imageIds } = req.body;

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });

    roomType.images.sort((a, b) => imageIds.indexOf(a._id.toString()) - imageIds.indexOf(b._id.toString()));
    
    roomType.images.forEach((img, index) => {
      img.order = index;
      img.isPrimary = (index === 0);
    });

    await roomType.save();
    res.status(200).json({ message: 'Cập nhật thứ tự thành công', images: roomType.images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { roomTypeId, imageId } = req.params;

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });

    if (roomType.isSelling && roomType.images.length <= 1) {
      return res.status(400).json({ 
        message: 'Không thể xoá ảnh cuối cùng của loại phòng đang kinh doanh!' 
      });
    }

    roomType.images = roomType.images.filter(img => img._id.toString() !== imageId);

    roomType.images.forEach((img, index) => {
      img.order = index;
      img.isPrimary = (index === 0);
    });

    await roomType.save();
    res.status(200).json({ message: 'Xoá ảnh thành công', images: roomType.images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};