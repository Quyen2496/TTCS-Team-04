const Booking = require('./booking.model');
const Room = require('../rooms/room.model');
const RoomNight = require('./booking-room-night.model');

// [S3-03-LC01] Lấy danh sách phòng trống phù hợp
async function getAvailableRooms(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Không tìm thấy booking.");
    if (booking.status !== 'CONFIRMED') throw new Error("Chỉ gán phòng cho booking đã xác nhận.");

    const roomsOfType = await Room.find({ roomTypeId: booking.roomTypeId, status: { $ne: 'MAINTENANCE' } });
    const conflictingNights = await RoomNight.find({
        stayDate: { $gte: booking.checkIn, $lt: booking.checkOut },
        bookingId: { $ne: booking._id }
    });

    const occupiedRoomIds = new Set(conflictingNights.map(rn => rn.roomId.toString()));
    return roomsOfType.filter(room => !occupiedRoomIds.has(room._id.toString()));
}

// [S3-03-LC01] Gán phòng
async function assignRoom(bookingId, roomId) {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== 'CONFIRMED') throw new Error("Booking không hợp lệ để gán phòng.");

    const targetRoom = await Room.findById(roomId);
    if (!targetRoom || targetRoom.roomTypeId.toString() !== booking.roomTypeId.toString()) {
        throw new Error("Phòng không thuộc đúng loại phòng.");
    }

    const conflict = await RoomNight.findOne({
        roomId: roomId,
        stayDate: { $gte: booking.checkIn, $lt: booking.checkOut },
        bookingId: { $ne: booking._id }
    }).populate('bookingId', 'code guestName');

    if (conflict) {
        throw new Error(`Phòng ${targetRoom.roomNumber} đã bị chiếm.`);
    }

    booking.roomId = roomId;
    await booking.save();
    return booking;
}

// [S3-03-LC02] Đổi phòng (bắt buộc lý do)
async function changeRoom(bookingId, newRoomId, reason) {
    if (!reason || !reason.trim()) throw new Error("Bắt buộc phải nhập lý do đổi phòng.");

    const booking = await Booking.findById(bookingId);
    const newRoom = await Room.findById(newRoomId);
    if (!booking || !newRoom) throw new Error("Booking hoặc phòng mới không tồn tại.");

    if (booking.status === 'CHECKED_IN' && newRoom.status !== 'CLEAN_VACANT') {
        throw new Error("Khách đang ở chỉ được đổi sang phòng trống sạch.");
    }

    const oldRoomId = booking.roomId;
    booking.roomId = newRoomId;
    if (!booking.roomChangeHistory) booking.roomChangeHistory = [];
    booking.roomChangeHistory.push({ oldRoomId, newRoomId, reason, changedAt: new Date() });
    await booking.save();

    if (booking.status === 'CHECKED_IN') {
        await Room.findByIdAndUpdate(oldRoomId, { status: 'DIRTY_VACANT' });
        await Room.findByIdAndUpdate(newRoomId, { status: 'OCCUPIED' });
    }

    return booking;
}

module.exports = {
    getAvailableRooms,
    assignRoom,
    changeRoom
};