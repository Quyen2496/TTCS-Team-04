/**
 * Validate dữ liệu đầu vào khi gửi yêu cầu huỷ booking
 */
const validateCancelBookingInput = (req, res, next) => {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Lý do huỷ booking là bắt buộc và không được để trống.'
    });
  }

  if (reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Lý do huỷ booking phải có tối thiểu 5 ký tự.'
    });
  }

  next();
};

module.exports = {
  validateCancelBookingInput
};