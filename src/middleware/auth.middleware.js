const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực phiên làm việc (JWT)
 */
const verifyToken = (req, res, next) => {
  // 1. Lấy chuỗi Authorization từ Header request
  const authHeader = req.headers['authorization'];
  
  // Header chuẩn có dạng: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Nếu request không có token -> Báo lỗi 401
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Yêu cầu bị từ chối: Không tìm thấy token phiên đăng nhập!'
    });
  }

  // 3. Giải mã và xác thực token với secret key
  try {
    const secretKey = process.env.JWT_SECRET || 'CHANGE_ME_LOCALLY';
    const decoded = jwt.verify(token, secretKey);

    // Đính kèm dữ liệu người dùng (id, email, role) vào req.user
    req.user = decoded;
    next(); // Chuyển sang bước tiếp theo
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc phiên làm việc đã hết hạn!'
    });
  }
};

module.exports = { verifyToken };