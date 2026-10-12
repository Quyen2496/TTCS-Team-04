const roomWarningService = require('./roomWarning.service');

const getRoomWarnings = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await roomWarningService.getRoomShortageWarnings({
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách cảnh báo thiếu phòng thành công.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoomWarnings
};