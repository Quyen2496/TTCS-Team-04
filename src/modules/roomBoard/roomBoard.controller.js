const roomBoardService = require('./roomBoard.service');

const getRoomBoard = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const result = await roomBoardService.getRoomBoardData({ from, to });

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu sơ đồ phòng 14 ngày thành công.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoomBoard
};