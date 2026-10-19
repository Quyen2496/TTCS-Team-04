const rooms = [
  { code: "101", name: "Phòng Standard Sân Vườn", type: "2 người", price: 500000, imageType: "standard", status: "available" },
  { code: "102", name: "Phòng Deluxe Ban Công", type: "2 người", price: 700000, imageType: "deluxe", status: "available" },
  { code: "103", name: "Phòng Superior Hướng Đồi", type: "3 người", price: 850000, imageType: "superior", status: "available" },
  { code: "104", name: "Phòng Family Vườn", type: "4 người", price: 1100000, imageType: "family", status: "available" },
  { code: "105", name: "Phòng Deluxe Hướng Hồ", type: "2 người", price: 750000, imageType: "deluxe", status: "available" },
  { code: "201", name: "Phòng Superior Bình Minh", type: "3 người", price: 880000, imageType: "superior", status: "available" },
  { code: "202", name: "Phòng Family Sân Thượng", type: "4 người", price: 1150000, imageType: "family", status: "available" },
  { code: "203", name: "Phòng Deluxe Ấm Cúng", type: "2 người", price: 720000, imageType: "deluxe", status: "available" },
  { code: "204", name: "Phòng Standard Hoa Sen", type: "2 người", price: 520000, imageType: "standard", status: "available" },
  { code: "205", name: "Phòng Superior Thông Xanh", type: "3 người", price: 900000, imageType: "superior", status: "available" },
  { code: "206", name: "Phòng Family Toàn Cảnh", type: "4 người", price: 1200000, imageType: "family", status: "available" },
  { code: "207", name: "Phòng Deluxe Hồ Bơi Riêng", type: "2 người", price: 950000, imageType: "deluxe", status: "available" }
];

const roomImages = {
  standard: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85",
  deluxe: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=85",
  superior: "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=85",
  family: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85"
};

let selectedRoom = null;
const closedRoomCodes = new Set(JSON.parse(localStorage.getItem("homestayClosedRooms") || "[]"));
const stays = JSON.parse(localStorage.getItem("homestayStays") || "[]");

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function nightsBetween(start, end) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  return (Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)) / 86400000;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function isActiveStay(stay) {
  return stay.status === "reserved" || stay.status === "checkedIn";
}

function saveStays() {
  localStorage.setItem("homestayStays", JSON.stringify(stays));
}

stays.forEach(stay => {
  if (stay.status === "reserved" && stay.checkoutDate <= localDateString()) {
    stay.status = "expired";
  }
});
saveStays();

const roomList = document.getElementById("roomList");
const selectedRoomText = document.getElementById("selectedRoom");
const selectedPrice = document.getElementById("selectedPrice");
const nightsText = document.getElementById("nights");
const totalText = document.getElementById("total");
const checkinDate = document.getElementById("checkinDate");
const checkoutDate = document.getElementById("checkoutDate");
const stayList = document.getElementById("stayList");

function money(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function renderRooms() {
  roomList.innerHTML = rooms.map(room => {
    const stay = stays.find(item => item.roomCode === room.code && isActiveStay(item) &&
      overlaps(item.checkinDate, item.checkoutDate, checkinDate.value, checkoutDate.value));
    const closed = closedRoomCodes.has(room.code);
    const unavailable = closed || Boolean(stay);
    const status = closed ? "closed" : stay ? (stay.status === "checkedIn" ? "busy" : "reserved") : "available";
    const statusLabel = { available: "Trống", busy: "Đang sử dụng", reserved: "Đã đặt", closed: "Đã đóng" }[status];
    const hasActiveStay = stays.some(item => item.roomCode === room.code && isActiveStay(item));
    return `
    <div class="room ${unavailable ? "disabled" : ""} ${selectedRoom?.code === room.code ? "selected" : ""}"
         data-code="${room.code}">
      <img class="room-image" src="${roomImages[room.imageType]}" alt="Không gian ${room.name}" loading="lazy">
      <div class="room-top">
        <span class="room-code">Phòng ${room.code}</span>
        <span class="status ${status}">${statusLabel}</span>
      </div>
      <h4>${room.name}</h4>
      <p>${room.type}</p>
      <div class="price">${money(room.price)} / đêm</div>
      <button type="button" class="room-toggle" data-code="${room.code}" ${hasActiveStay ? "disabled" : ""}>
        ${closed ? "Mở phòng" : hasActiveStay ? "Có lưu trú" : "Đóng phòng"}
      </button>
    </div>
  `;
  }).join("");

  document.querySelectorAll(".room:not(.disabled)").forEach(card => {
    card.addEventListener("click", () => {
      selectedRoom = rooms.find(room => room.code === card.dataset.code);
      renderRooms();
      updateSummary();
    });
  });

  document.querySelectorAll(".room-toggle:not(:disabled)").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const roomCode = button.dataset.code;
      if (closedRoomCodes.has(roomCode)) {
        closedRoomCodes.delete(roomCode);
      } else {
        closedRoomCodes.add(roomCode);
        if (selectedRoom?.code === roomCode) selectedRoom = null;
      }
      localStorage.setItem("homestayClosedRooms", JSON.stringify([...closedRoomCodes]));
      renderRooms();
      updateSummary();
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function renderStays() {
  const activeStays = stays.filter(isActiveStay).sort((a, b) => a.checkinDate.localeCompare(b.checkinDate));
  if (!activeStays.length) {
    stayList.innerHTML = '<p class="empty-state">Chưa có lượt lưu trú hoặc đặt phòng nào.</p>';
    return;
  }

  stayList.innerHTML = activeStays.map(stay => {
    const room = rooms.find(item => item.code === stay.roomCode);
    const dueForCheckin = stay.status === "reserved" && stay.checkinDate <= localDateString();
    const statusLabel = stay.status === "checkedIn" ? "Đang lưu trú" : "Đã đặt";
    const action = stay.status === "checkedIn"
      ? '<button type="button" class="stay-action" data-action="checkout">Trả phòng</button>'
      : dueForCheckin
        ? '<button type="button" class="stay-action" data-action="checkin">Xác nhận khách đến</button>'
        : '<button type="button" class="stay-action secondary-action" data-action="cancel">Hủy đặt</button>';
    return `
      <article class="stay-item">
        <div class="stay-details">
          <strong>${escapeHtml(stay.guestName)} · Phòng ${escapeHtml(stay.roomCode)}</strong>
          <span>${escapeHtml(room?.name || "Phòng")} · ${escapeHtml(stay.guests)} người · ${escapeHtml(stay.checkinDate)} đến ${escapeHtml(stay.checkoutDate)}</span>
          <span class="stay-status ${stay.status}">${statusLabel}</span>
        </div>
        <div class="stay-controls" data-stay-id="${escapeHtml(stay.id)}">${action}</div>
      </article>
    `;
  }).join("");

  stayList.querySelectorAll(".stay-action").forEach(button => {
    button.addEventListener("click", () => handleStayAction(button));
  });
}

function handleStayAction(button) {
  const controls = button.closest(".stay-controls");
  const stay = stays.find(item => item.id === controls.dataset.stayId);
  if (!stay) return;

  if (button.dataset.action === "checkout") {
    if (!window.confirm(`Xác nhận trả phòng ${stay.roomCode} cho khách ${stay.guestName}?`)) return;
    stay.status = "checkedOut";
    stay.actualCheckoutDate = localDateString();
  } else if (button.dataset.action === "checkin") {
    stay.status = "checkedIn";
    stay.actualCheckinDate = localDateString();
  } else {
    if (!window.confirm(`Xác nhận hủy đặt phòng ${stay.roomCode} của khách ${stay.guestName}?`)) return;
    stay.status = "cancelled";
  }

  saveStays();
  renderStays();
  renderRooms();
  updateSummary();
}

function updateSummary() {
  if (!selectedRoom) {
    selectedRoomText.textContent = "Chưa chọn phòng";
    selectedPrice.textContent = "-";
    totalText.textContent = "-";
  } else {
    selectedRoomText.textContent = `Phòng ${selectedRoom.code} - ${selectedRoom.name}`;
    selectedPrice.textContent = money(selectedRoom.price);
  }

  const start = new Date(checkinDate.value);
  const end = new Date(checkoutDate.value);

  if (checkinDate.value && checkoutDate.value && end > start) {
    const nights = nightsBetween(checkinDate.value, checkoutDate.value);
    nightsText.textContent = `${nights} đêm`;
    totalText.textContent = selectedRoom ? money(nights * selectedRoom.price) : "-";
  } else {
    nightsText.textContent = "-";
    totalText.textContent = "-";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

document.getElementById("today").textContent =
  new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

function setDefaultDates() {
  checkinDate.value = localDateString();
  checkoutDate.value = addDays(checkinDate.value, 1);
  checkinDate.min = checkinDate.value;
  checkoutDate.min = checkoutDate.value;
}

function refreshAvailability() {
  if (selectedRoom && (closedRoomCodes.has(selectedRoom.code) || stays.some(stay =>
    stay.roomCode === selectedRoom.code && isActiveStay(stay) &&
    overlaps(stay.checkinDate, stay.checkoutDate, checkinDate.value, checkoutDate.value)))) {
    selectedRoom = null;
  }
  renderRooms();
  updateSummary();
}

setDefaultDates();

checkinDate.addEventListener("change", () => {
  checkinDate.min = localDateString();
  if (!checkinDate.value) {
    checkoutDate.value = "";
    checkoutDate.min = addDays(localDateString(), 1);
  } else {
    if (checkoutDate.value <= checkinDate.value) {
      checkoutDate.value = addDays(checkinDate.value, 1);
    }
    checkoutDate.min = addDays(checkinDate.value, 1);
  }
  refreshAvailability();
});

checkoutDate.addEventListener("change", refreshAvailability);

document.getElementById("checkinForm").addEventListener("submit", function(e) {
  e.preventDefault();

  document.querySelectorAll(".error").forEach(el => el.textContent = "");

  let valid = true;
  const name = document.getElementById("guestName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const idNumber = document.getElementById("idNumber").value.trim();
  const guests = Number(document.getElementById("guests").value);
  const today = localDateString();

  if (!selectedRoom) {
    showToast("Vui lòng chọn phòng.");
    valid = false;
  }

  if (!name) {
    document.getElementById("guestNameError").textContent = "Vui lòng nhập họ và tên.";
    valid = false;
  }

  if (!/^0\d{9,10}$/.test(phone)) {
    document.getElementById("phoneError").textContent = "Số điện thoại không hợp lệ.";
    valid = false;
  }

  if (!/^\d{9,12}$/.test(idNumber)) {
    document.getElementById("idError").textContent = "CCCD/CMND không hợp lệ.";
    valid = false;
  }

  if (!Number.isInteger(guests) || guests < 1 || (selectedRoom && guests > Number(selectedRoom.type.match(/\d+/)[0]))) {
    document.getElementById("guestsError").textContent = "Số người vượt quá sức chứa phòng.";
    valid = false;
  }

  if (!checkinDate.value || checkinDate.value < today) {
    document.getElementById("checkinDateError").textContent = "Vui lòng chọn ngày nhận phòng từ hôm nay trở đi.";
    valid = false;
  }

  if (!(checkinDate.value && checkoutDate.value && checkoutDate.value > checkinDate.value)) {
    document.getElementById("dateError").textContent = "Ngày trả phòng phải sau ngày nhận phòng.";
    valid = false;
  }

  if (selectedRoom && (closedRoomCodes.has(selectedRoom.code) || stays.some(stay =>
    stay.roomCode === selectedRoom.code && isActiveStay(stay) &&
    overlaps(stay.checkinDate, stay.checkoutDate, checkinDate.value, checkoutDate.value)))) {
    showToast("Phòng không còn trống trong khoảng ngày đã chọn.");
    valid = false;
  }

  if (!valid) return;

  const stay = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    roomCode: selectedRoom.code,
    guestName: name,
    phone,
    idNumber,
    guests,
    checkinDate: checkinDate.value,
    checkoutDate: checkoutDate.value,
    status: checkinDate.value === today ? "checkedIn" : "reserved",
    createdAt: new Date().toISOString()
  };
  stays.push(stay);
  saveStays();
  showToast(stay.status === "checkedIn"
    ? `Đã nhận phòng ${selectedRoom.code} thành công.`
    : `Đã lưu đặt phòng ${selectedRoom.code}.`);

  setTimeout(() => {
    this.reset();
    setDefaultDates();
    selectedRoom = null;
    renderRooms();
    renderStays();
    updateSummary();
  }, 700);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("checkinForm").reset();
  setDefaultDates();
  selectedRoom = null;
  document.querySelectorAll(".error").forEach(el => el.textContent = "");
  renderRooms();
  updateSummary();
});

renderRooms();
renderStays();
updateSummary();
