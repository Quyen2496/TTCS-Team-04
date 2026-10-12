/**
 * Module Lễ Tân - Gán & Đổi phòng (PBI S3-03)
 */
document.addEventListener('DOMContentLoaded', () => {
    // Tự động khởi tạo responsive layout (sidebar + mobile hamburger)
    if (window.HomestayLayout) {
        window.HomestayLayout.init();
    }
});

// 1. Mở Modal Gán phòng & Tải danh sách phòng trống (S3-03-LC01)
async function openAssignRoomModal(bookingId) {
    try {
        const res = await fetch(`/api/bookings/${bookingId}/available-rooms`);
        const data = await res.json();

        if (!res.ok || !data.success) {
            alert(data.message || 'Không thể lấy danh sách phòng trống.');
            return;
        }

        const rooms = data.data.availableRooms;
        let optionsHtml = '<option value="">-- Chọn phòng phù hợp --</option>';
        rooms.forEach(room => {
            optionsHtml += `<option value="${room._id}">Phòng ${room.roomNumber} - Tầng ${room.floor}</option>`;
        });

        const selectElem = document.getElementById('assignRoomSelect');
        if (selectElem) selectElem.innerHTML = optionsHtml;

        document.getElementById('currentBookingId').value = bookingId;
        document.getElementById('assignRoomModal').style.display = 'block';
    } catch (err) {
        console.error('Lỗi khi tải danh sách phòng:', err);
        alert('Đã xảy ra lỗi kết nối máy chủ.');
    }
}

// 2. Gửi yêu cầu Gán phòng (S3-03-LC01)
async function submitAssignRoom(event) {
    event.preventDefault();
    const bookingId = document.getElementById('currentBookingId').value;
    const roomId = document.getElementById('assignRoomSelect').value;

    if (!roomId) {
        alert('Vui lòng chọn phòng để gán.');
        return;
    }

    try {
        const res = await fetch(`/api/bookings/${bookingId}/assign-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId })
        });
        const result = await res.json();

        if (res.ok && result.success) {
            alert(result.message || 'Gán phòng thành công!');
            closeModal('assignRoomModal');
            if (typeof window.reloadReceptionBoard === 'function') window.reloadReceptionBoard();
        } else {
            alert(result.message || 'Lỗi gán phòng.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

// 3. Gửi yêu cầu Đổi phòng (S3-03-LC02 - Bắt buộc lý do)
async function submitChangeRoom(event) {
    event.preventDefault();
    const bookingId = document.getElementById('changeBookingId').value;
    const newRoomId = document.getElementById('changeRoomSelect').value;
    const reason = document.getElementById('changeReasonInput').value;

    if (!newRoomId) {
        alert('Vui lòng chọn phòng mới.');
        return;
    }
    if (!reason || !reason.trim()) {
        alert('Bắt buộc phải nhập lý do đổi phòng.');
        return;
    }

    try {
        const res = await fetch(`/api/bookings/${bookingId}/change-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newRoomId, reason })
        });
        const result = await res.json();

        if (res.ok && result.success) {
            alert(result.message || 'Đổi phòng thành công!');
            closeModal('changeRoomModal');
            if (typeof window.reloadReceptionBoard === 'function') window.reloadReceptionBoard();
        } else {
            alert(result.message || 'Lỗi đổi phòng.');
        }
    } catch (err) {
        alert('Lỗi kết nối máy chủ.');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}