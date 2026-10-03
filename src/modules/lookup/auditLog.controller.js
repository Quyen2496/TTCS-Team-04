/**
 * Controller tra cứu Nhật ký hệ thống (Audit Log)
 * Phân trang 50 bản ghi/trang, chỉ dành cho Admin
 */
const getAuditLogs = async (req, res) => {
  try {
    // 1. Kiểm tra quyền Admin (Đã mở lại bảo mật)
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Truy cập bị từ chối. Chỉ Admin mới có quyền xem nhật ký hệ thống."
      });
    }

    // 2. Lấy bộ lọc từ URL Query
    const page = parseInt(req.query.page) || 1;
    const limit = 50; // Phân trang đúng 50 dòng/trang
    const { username } = req.query;

    // Dữ liệu mẫu (Mock data)
    const mockAuditLogs = [
      {
        _id: "log_01",
        actor: { userId: "usr_admin01", username: "admin_quynh", role: "ADMIN" },
        action: "DISABLE_USER",
        target: "usr_client05",
        details: "Vô hiệu hóa tài khoản vi phạm",
        ipAddress: "192.168.1.10",
        timestamp: "2026-10-03T21:15:00+07:00"
      },
      {
        _id: "log_02",
        actor: { userId: "usr_admin01", username: "admin_quynh", role: "ADMIN" },
        action: "VIEW_ID_CARD",
        target: "usr_guest12",
        details: "Xem ảnh giấy tờ khách hàng",
        ipAddress: "192.168.1.10",
        timestamp: "2026-10-03T20:45:10+07:00"
      }
    ];

    let filteredLogs = mockAuditLogs;
    if (username) {
      filteredLogs = filteredLogs.filter(log => 
        log.actor.username.toLowerCase().includes(username.toLowerCase())
      );
    }

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách nhật ký hệ thống thành công",
      pagination: {
        page: page,
        pageSize: limit,
        totalRecords: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limit) || 1
      },
      data: filteredLogs
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tra cứu nhật ký",
      error: error.message
    });
  }
};

module.exports = {
  getAuditLogs
};