const API_URL = '/api/rooms';

const roomTypeIdInput = document.getElementById('roomTypeId');
const floorInput = document.getElementById('floor');
const statusSelect = document.getElementById('status');

const filterButton = document.getElementById('filterButton');
const resetFilterButton = document.getElementById('resetFilter');
const reloadButton = document.getElementById('reloadButton');

const roomCount = document.getElementById('roomCount');
const roomTableBody = document.getElementById('roomTableBody');

const loading = document.getElementById('loading');
const error = document.getElementById('error');
const empty = document.getElementById('empty');
const roomTableWrapper = document.getElementById('roomTableWrapper');

const statusLabels = {
    CLEAN_VACANT: 'Sạch - Trống',
    DIRTY_VACANT: 'Bẩn - Trống',
    OCCUPIED: 'Đang có khách',
    MAINTENANCE: 'Bảo trì'
};

function showOnly(element) {
    loading.classList.add('hidden');
    error.classList.add('hidden');
    empty.classList.add('hidden');
    roomTableWrapper.classList.add('hidden');

    if (element) {
        element.classList.remove('hidden');
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'CLEAN_VACANT':
            return 'status status-clean';

        case 'DIRTY_VACANT':
            return 'status status-dirty';

        case 'OCCUPIED':
            return 'status status-occupied';

        case 'MAINTENANCE':
            return 'status status-maintenance';

        default:
            return 'status';
    }
}

function getStatusLabel(status) {
    return statusLabels[status] || status;
}

function renderRooms(rooms) {
    roomTableBody.innerHTML = '';

    roomCount.textContent = `${rooms.length} phòng`;

    if (rooms.length === 0) {
        showOnly(empty);
        return;
    }

    rooms.forEach((room, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(room.roomNumber)}</strong></td>
            <td>${escapeHtml(room.roomTypeId || '')}</td>
            <td>${room.floor}</td>
            <td>
                <span class="${getStatusClass(room.status)}">
                    ${escapeHtml(getStatusLabel(room.status))}
                </span>
            </td>
        `;

        roomTableBody.appendChild(row);
    });

    showOnly(roomTableWrapper);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function loadRooms() {
    showOnly(loading);

    const params = new URLSearchParams();

    const roomTypeId = roomTypeIdInput.value.trim();
    const floor = floorInput.value.trim();
    const status = statusSelect.value;

    if (roomTypeId) {params.set('roomTypeId', roomTypeId);
    }

    if (floor) {
        params.set('floor', floor);
    }

    if (status) {
        params.set('status', status);
    }

    const query = params.toString();

    const url = query
        ? `${API_URL}?${query}`
        : API_URL;

    try {
        const response = await fetch(url);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Không thể lấy danh sách phòng');
        }

        renderRooms(result.data || []);
    } catch (err) {
        roomCount.textContent = '0 phòng';
        error.textContent = err.message || 'Đã xảy ra lỗi khi tải danh sách phòng';
        showOnly(error);
    }
}

filterButton.addEventListener('click', loadRooms);

reloadButton.addEventListener('click', loadRooms);

resetFilterButton.addEventListener('click', () => {
    roomTypeIdInput.value = '';
    floorInput.value = '';
    statusSelect.value = '';

    loadRooms();
});

loadRooms();
// ===================================================
// S2-09: LOGIC XỬ LÝ ẢNH LOẠI PHÒNG
// ===================================================
let currentImages = [];
let draggedItemIndex = null;

const imageFileInput = document.getElementById('imageFileInput');
const uploadDropzone = document.getElementById('uploadDropzone');
const imageGrid = document.getElementById('imageGrid');
const emptyImageState = document.getElementById('emptyImageState');
const imageStatusMsg = document.getElementById('imageStatusMsg');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressBar = document.getElementById('uploadProgressBar');

if (uploadDropzone) {
  uploadDropzone.addEventListener('click', () => imageFileInput.click());
}

if (imageFileInput) {
  imageFileInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
  });
}

function showStatus(msg, type = 'error') {
  if (!imageStatusMsg) return;
  imageStatusMsg.className = `status-message ${type}`;
  imageStatusMsg.innerText = msg;
  setTimeout(() => {
    imageStatusMsg.className = 'status-message';
    imageStatusMsg.innerText = '';
  }, 5000);
}

async function loadRoomTypeImages(roomTypeId) {
  document.getElementById('currentRoomTypeId').value = roomTypeId;
  try {
    const res = await fetch(`/api/rooms/room-types/${roomTypeId}`);
    if (!res.ok) throw new Error('Không thể lấy thông tin loại phòng');
    const data = await res.json();
    
    currentImages = (data.images || []).sort((a, b) => a.order - b.order);
    renderImageGrid();
  } catch (err) {
    showStatus(err.message, 'error');
  }
}

function renderImageGrid() {
  if (!imageGrid) return;
  imageGrid.innerHTML = '';
  
  if (!currentImages || currentImages.length === 0) {
    if (emptyImageState) emptyImageState.style.display = 'block';
    imageGrid.appendChild(emptyImageState);
    return;
  }

  if (emptyImageState) emptyImageState.style.display = 'none';

  currentImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.setAttribute('draggable', 'true');
    item.dataset.id = img._id;
    item.dataset.index = index;

    item.innerHTML = `
      ${img.isPrimary ? '<span class="primary-badge">Đại diện</span>' : ''}
      <img src="${img.thumbUrl || img.url}" alt="Ảnh loại phòng" />
      <button class="btn-delete-img" onclick="deleteImage('${img._id}')" title="Xoá ảnh">✕</button>
    `;

    item.addEventListener('dragstart', () => {
      draggedItemIndex = index;
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = index;
      if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
        reorderImagesUI(draggedItemIndex, targetIndex);
      }
    });

    imageGrid.appendChild(item);
  });
}

async function handleFileUpload(files) {
  const roomTypeId = document.getElementById('currentRoomTypeId').value;
  if (!roomTypeId) return showStatus('Chưa chọn loại phòng!', 'error');

  if (files.length === 0) return;

  if (currentImages.length + files.length > 8) {
    return showStatus('Số lượng ảnh vượt quá giới hạn 8 ảnh/loại phòng!', 'error');
  }

  const formData = new FormData();
  for (let file of files) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return showStatus(`File ${file.name} không đúng định dạng JPG/PNG!`, 'error');
    }
    if (file.size > 5 * 1024 * 1024) {
      return showStatus(`File ${file.name} vượt quá dung lượng 5MB!`, 'error');
    }
    formData.append('images', file);
  }

  uploadDropzone.classList.add('disabled');
  uploadProgress.style.display = 'block';
  uploadProgressBar.style.width = '30%';

  try {
    const res = await fetch(`/api/rooms/room-types/${roomTypeId}/images`, {
      method: 'POST',
      body: formData
    });

    uploadProgressBar.style.width = '100%';
    const result = await res.json();

    if (!res.ok) throw new Error(result.message || 'Upload thất bại');

    currentImages = result.images.sort((a, b) => a.order - b.order);
    renderImageGrid();
    showStatus('Upload ảnh thành công!', 'success');
  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    uploadDropzone.classList.remove('disabled');
    setTimeout(() => {
      uploadProgress.style.display = 'none';
      uploadProgressBar.style.width = '0%';
    }, 500);
    imageFileInput.value = '';
  }
}

async function reorderImagesUI(fromIndex, toIndex) {
  const roomTypeId = document.getElementById('currentRoomTypeId').value;
  
  const movedItem = currentImages.splice(fromIndex, 1)[0];
  currentImages.splice(toIndex, 0, movedItem);

  renderImageGrid();

  const imageIds = currentImages.map(img => img._id);

  try {
    const res = await fetch(`/api/rooms/room-types/${roomTypeId}/images/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Lưu thứ tự thất bại');

    currentImages = result.images.sort((a, b) => a.order - b.order);
    renderImageGrid();
    showStatus('Đã lưu thứ tự ảnh mới!', 'success');
  } catch (err) {
    showStatus(err.message, 'error');
    loadRoomTypeImages(roomTypeId);
  }
}

async function deleteImage(imageId) {
  const roomTypeId = document.getElementById('currentRoomTypeId').value;

  const confirmDelete = confirm('Bạn có chắc chắn muốn xoá ảnh này không?');
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/rooms/room-types/${roomTypeId}/images/${imageId}`, {
      method: 'DELETE'
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Xoá ảnh thất bại');

    currentImages = result.images.sort((a, b) => a.order - b.order);
    renderImageGrid();
    showStatus('Xoá ảnh thành công!', 'success');
  } catch (err) {
    showStatus(err.message, 'error');
  }
}
