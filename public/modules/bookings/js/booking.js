"use strict";

const form = document.getElementById("booking-form");
const feedback = document.getElementById("feedback");
const field = (name) => form.elements.namedItem(name);

function clearValidation() {
  for (const input of form.elements) {
    if (typeof input.setCustomValidity === "function") {
      input.setCustomValidity("");
    }
  }
}

form.addEventListener("input", () => {
  clearValidation();
  feedback.hidden = true;
});

form.addEventListener("change", () => {
  clearValidation();
  feedback.hidden = true;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearValidation();
  feedback.hidden = true;

  field("guestName").value = field("guestName").value.trim();
  field("phone").value = field("phone").value.trim();
  field("email").value = field("email").value.trim();

  if (!field("guestName").value) {
    field("guestName").setCustomValidity("Vui lòng nhập họ và tên.");
  }

  if (!/^0[35789]\d{8}$/.test(field("phone").value)) {
    field("phone").setCustomValidity(
      "Nhập số điện thoại Việt Nam gồm 10 chữ số, ví dụ 0912345678."
    );
  }

  const checkIn = field("checkIn").value;
  const checkOut = field("checkOut").value;

  if (checkIn && checkOut) {
    const nights = (
      Date.parse(checkOut + "T00:00:00Z") -
      Date.parse(checkIn + "T00:00:00Z")
    ) / 86400000;

    if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
      field("checkOut").setCustomValidity(
        "Ngày trả phải sau ngày nhận, với kỳ lưu trú từ 1 đến 30 đêm."
      );
    }
  }

  if (!field("policyAccepted").checked) {
    field("policyAccepted").setCustomValidity(
      "Vui lòng xác nhận đã đọc chính sách huỷ đặt phòng."
    );
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  feedback.className = "alert alert-info mt-3";
  feedback.textContent =
    "Thông tin nhập hợp lệ. Đây là bản xem thử, chưa tạo booking hoặc giữ phòng.";
  feedback.hidden = false;
});
