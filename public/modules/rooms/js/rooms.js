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
