const CheckIn = require("./model");

function overlaps(startA, endA, startB, endB) { return startA < endB && startB < endA; }
const activeStatuses = ["reserved", "checkedIn"];

async function createCheckIn(payload) {
  const roomCode = String(payload.roomCode).trim();
  const conflict = await CheckIn.findOne({ roomCode, status: { $in: activeStatuses }, checkinDate: { $lt: payload.checkoutDate }, checkoutDate: { $gt: payload.checkinDate } });
  if (conflict) { const e = new Error("Phòng không còn trống trong khoảng ngày đã chọn"); e.statusCode = 409; throw e; }
  const status = payload.checkinDate === new Date().toISOString().slice(0,10) ? "checkedIn" : "reserved";
  return CheckIn.create({ ...payload, roomCode, guests: Number(payload.guests), status, actualCheckinDate: status === "checkedIn" ? payload.checkinDate : null });
}
async function listCheckIns(query={}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.roomCode) filter.roomCode = String(query.roomCode).trim();
  const rows = await CheckIn.find(filter).sort({ createdAt: -1 });
  return rows;
}
async function getCheckInById(id) { return CheckIn.findById(id); }
async function updateStatus(id, action) {
  const stay = await CheckIn.findById(id);
  if (!stay) { const e = new Error("Không tìm thấy lượt lưu trú"); e.statusCode=404; throw e; }
  if (action === "checkout") {
    if (stay.status !== "checkedIn") { const e=new Error("Lượt lưu trú chưa ở trạng thái đang lưu trú"); e.statusCode=409; throw e; }
    stay.status="checkedOut"; stay.actualCheckoutDate=new Date().toISOString().slice(0,10);
  } else if (action === "checkin") {
    if (stay.status !== "reserved") { const e=new Error("Lượt đặt phòng không hợp lệ để check-in"); e.statusCode=409; throw e; }
    stay.status="checkedIn"; stay.actualCheckinDate=new Date().toISOString().slice(0,10);
  } else if (action === "cancel") {
    if (stay.status !== "reserved") { const e=new Error("Chỉ được hủy đặt phòng"); e.statusCode=409; throw e; }
    stay.status="cancelled";
  }
  await stay.save(); return stay;
}
module.exports={createCheckIn,listCheckIns,getCheckInById,updateStatus};
