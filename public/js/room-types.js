const API_URL = '/api/rooms/types';

document.addEventListener('DOMContentLoaded', () => {
  fetchRoomTypes();
});

// 1. Lấy danh sách Loại phòng từ API
async function fetchRoomTypes() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    if (response.ok) {
      renderRoomTypes(result.data);
    } else {
      console.error(result.message || 'Lỗi khi tải danh sách');
    }
  } catch (error) {
    console.error('Lỗi kết nối server Backend:', error);
  }
}

// 2. Đổ dữ liệu lên bảng
function renderRoomTypes(roomTypes) {
  const tbody = document.getElementById('roomTypeTableBody');
  if (!tbody) return;

  if (!roomTypes || roomTypes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Chưa có loại phòng nào trên hệ thống</td></tr>`;
    return;
  }

  tbody.innerHTML = roomTypes
    .map(item => {
      const statusBadge =
        item.status === 'ACTIVE'
          ? '<span class="badge badge-success">Đang kinh doanh</span>'
          : '<span class="badge badge-danger">Ngừng bán</span>';

      return `
        <tr>
          <td><strong>${item.code}</strong></td>
          <td>${item.name}</td>
          <td>${item.standardCapacity} người / Tối đa: ${item.maxCapacity} người</td>
          <td>${item.bedInfo || 'Chưa cập nhật'}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="openEditModal('${encodeURIComponent(JSON.stringify(item))}')">Sửa</button>
            <button class="btn btn-sm btn-danger" onclick="deleteRoomType('${item._id}')">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

// 3. Mở Modal Thêm mới
function openAddModal() {
  document.getElementById('roomTypeId').value = '';
  document.getElementById('roomTypeForm').reset();
  document.getElementById('modalTitle').innerText = 'Thêm loại phòng mới';
  document.getElementById('code').disabled = false;
  document.getElementById('roomTypeModal').style.display = 'block';
}

// 4. Mở Modal Chỉnh sửa
function openEditModal(jsonString) {
  const item = JSON.parse(decodeURIComponent(jsonString));
  document.getElementById('roomTypeId').value = item._id;
  document.getElementById('code').value = item.code;
  document.getElementById('code').disabled = true; // Không cho sửa mã code
  document.getElementById('name').value = item.name;
  document.getElementById('standardCapacity').value = item.standardCapacity;
  document.getElementById('maxCapacity').value = item.maxCapacity;
  document.getElementById('bedInfo').value = item.bedInfo || '';
  document.getElementById('description').value = item.description || '';
  document.getElementById('status').value = item.status;

  document.getElementById('modalTitle').innerText = 'Chỉnh sửa loại phòng';
  document.getElementById('roomTypeModal').style.display = 'block';
}

// 5. Đóng Modal
function closeModal() {
  document.getElementById('roomTypeModal').style.display = 'none';
}

// 6. Xử lý Thêm / Cập nhật Loại phòng
async function handleSaveRoomType(event) {
  event.preventDefault();

  const id = document.getElementById('roomTypeId').value;
  const payload = {
    code: document.getElementById('code').value.trim(),
    name: document.getElementById('name').value.trim(),
    standardCapacity: Number(document.getElementById('standardCapacity').value),
    maxCapacity: Number(document.getElementById('maxCapacity').value),
    bedInfo: document.getElementById('bedInfo').value.trim(),
    description: document.getElementById('description').value.trim(),
    status: document.getElementById('status').value
  };

  if (payload.maxCapacity < payload.standardCapacity) {
    alert('Sức chứa tối đa không được nhỏ hơn sức chứa tiêu chuẩn!');
    return;
  }

  const url = id ? `${API_URL}/${id}` : API_URL;
  const method = id ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      alert(id ? 'Cập nhật loại phòng thành công!' : 'Tạo loại phòng mới thành công!');
      closeModal();
      fetchRoomTypes();
    } else {
      alert(result.message || 'Có lỗi xảy ra!');
    }
  } catch (error) {
    alert('Lỗi kết nối tới hệ thống server');
  }
}

// 7. Xóa loại phòng
async function deleteRoomType(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa loại phòng này?')) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (response.ok) {
      alert('Xóa loại phòng thành công!');
      fetchRoomTypes();
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert('Lỗi kết nối khi xóa loại phòng');
  }
}