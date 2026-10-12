/**
 * Middleware phân quyền dựa theo vai trò người dùng (Role)
 * @param {...string} allowedRoles - Các vai trò được truy cập (ví dụ: 'admin', 'receptionist')
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Kiểm tra thông tin req.user đã tồn tại chưa
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Từ chối truy cập: Thiếu thông tin phân quyền người dùng!'
      });
    }

    // 2. Kiểm tra role của user có nằm trong danh sách được phép
    const hasPermission = allowedRoles.includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực thi chức năng này!'
      });
    }

    // 3. Hợp lệ -> Cho phép đi tiếp
    next();
  };
};

module.exports = { requireRoles };