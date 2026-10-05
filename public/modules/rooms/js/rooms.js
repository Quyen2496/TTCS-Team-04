<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quản lý phòng</title>
    <link rel="stylesheet" href="./css/room.css">
</head>

<body>

<header class="page-header">
    <div>
        <h1>Quản lý phòng</h1>
        <p>Quản lý phòng vật lý và trạng thái phòng</p>
    </div>
</header>

<main class="container">

    <!-- BỘ LỌC -->
    <section class="filter-card">
        <div class="filter-header">
            <h2>Bộ lọc</h2>

            <button id="resetFilter" type="button" class="btn-secondary">
                Xóa bộ lọc
            </button>
        </div>

        <div class="filter-grid">

            <div class="form-group">
                <label for="roomTypeId">Loại phòng</label>

                <input
                    id="roomTypeId"
                    type="text"
                    placeholder="Nhập roomTypeId"
                >
            </div>

            <div class="form-group">
                <label for="floor">Tầng</label>

                <input
                    id="floor"
                    type="number"
                    min="1"
                    placeholder="Ví dụ: 1"
                >
            </div>

            <div class="form-group">
                <label for="status">Trạng thái</label>

                <select id="status">
                    <option value="">Tất cả trạng thái</option>
                    <option value="CLEAN_VACANT">Sạch - Trống</option>
                    <option value="DIRTY_VACANT">Bẩn - Trống</option>
                    <option value="OCCUPIED">Đang có khách</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                </select>
            </div>

            <div class="filter-action">
                <button
                    id="filterButton"
                    type="button"
                    class="btn-primary"
                >
                    Lọc phòng
                </button>
            </div>

        </div>
    </section>

    <!-- DANH SÁCH PHÒNG -->
    <section class="room-card">

        <div class="room-card-header">

            <div>
                <h2>Danh sách phòng</h2>
                <span id="roomCount">0 phòng</span>
            </div>

            <div>
                <button
                    id="addRoomButton"
                    type="button"
                    class="btn-primary"
                >
                    + Thêm phòng
                </button>

                <button
                    id="reloadButton"
                    type="button"
                    class="btn-secondary"
                >
                    Làm mới
                </button>
            </div>

        </div>

        <!-- LOADING -->
        <div id="loading" class="state-message hidden">
            Đang tải danh sách phòng...
        </div>

        <!-- ERROR -->
        <div id="error" class="state-message error hidden"></div>

        <!-- EMPTY -->
        <div id="empty" class="state-message hidden">
            Không có phòng phù hợp.
        </div>

        <!-- TABLE -->
        <div id="roomTableWrapper" class="table-wrapper hidden">

            <table>

                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Số phòng</th>
                        <th>Loại phòng</th>
                        <th>Tầng</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>

                <tbody id="roomTableBody"></tbody>

            </table>

        </div>

    </section>

</main>

<!-- MODAL THÊM / SỬA PHÒNG -->
<div id="roomModal" class="modal hidden">

    <div class="modal-content">

        <div class="modal-header">

            <h2 id="modalTitle">Thêm phòng</h2>

            <button
                id="closeModalButton"
                type="button"
                class="btn-secondary"
            >
                Đóng
            </button>

        </div>

        <form id="roomForm">

            <input
                type="hidden"
                id="roomId"
            >

            <div class="form-group">
                <label for="roomNumber">
                    Số phòng <span>*</span>
                </label>

                <input
                    id="roomNumber"
                    type="text"
                    placeholder="Ví dụ: 101"
                    required
                >
            </div>

            <div class="form-group">
                <label for="formRoomTypeId">
                    Loại phòng <span>*</span>
                </label>

                <input
                    id="formRoomTypeId"
                    type="text"
                    placeholder="Nhập RoomType ID"
                    required
                >
            </div>

            <div class="form-group">
                <label for="formFloor">
                    Tầng <span>*</span>
                </label>

                <input
                    id="formFloor"
                    type="number"
                    min="1"
                    placeholder="Ví dụ: 1"
                    required
                >
            </div>

            <div class="form-group">
                <label for="formStatus">
                    Trạng thái
                </label>

                <select id="formStatus">
                    <option value="CLEAN_VACANT">
                        Sạch - Trống
                    </option>

                    <option value="DIRTY_VACANT">
                        Bẩn - Trống
                    </option>

                    <option value="OCCUPIED">
                        Đang có khách
                    </option>

                    <option value="MAINTENANCE">
                        Bảo trì
                    </option>
                </select>
            </div>

            <div class="form-group">
                <label for="note">
                    Ghi chú
                </label>

                <textarea
                    id="note"
                    rows="4"
                    placeholder="Nhập ghi chú cho phòng..."
                ></textarea>
            </div>

            <div class="modal-actions">

                <button
                    type="button"
                    id="cancelRoomButton"
                    class="btn-secondary"
                >
                    Hủy
                </button>

                <button
                    type="submit"
                    class="btn-primary"
                >
                    Lưu phòng
                </button>

            </div>

        </form>

    </div>

</div>

<script src="./js/rooms.js"></script>

</body>
</html>