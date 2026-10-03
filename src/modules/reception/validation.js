function validateCheckInPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") return ["Body request không hợp lệ"];
  if (!payload.roomCode) errors.push("roomCode là bắt buộc");
  if (!payload.guestName) errors.push("guestName là bắt buộc");
  if (!/^0\d{9,10}$/.test(String(payload.phone || ""))) errors.push("Số điện thoại không hợp lệ");
  if (!/^\d{9,12}$/.test(String(payload.idNumber || ""))) errors.push("CCCD/CMND không hợp lệ");
  if (!Number.isInteger(Number(payload.guests)) || Number(payload.guests) < 1) errors.push("guests phải là số nguyên >= 1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.checkinDate || ""))) errors.push("checkinDate không hợp lệ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.checkoutDate || ""))) errors.push("checkoutDate không hợp lệ");
  if (payload.checkinDate && payload.checkoutDate && payload.checkoutDate <= payload.checkinDate) errors.push("checkoutDate phải sau checkinDate");
  return errors;
}
module.exports = { validateCheckInPayload };
