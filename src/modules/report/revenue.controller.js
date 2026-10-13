const revenueService = require('./revenue.service');

const getRevenueReport = async (req, res, next) => {
  try {
    const { from, to, groupBy } = req.query;

    const data = await revenueService.getRevenueReport({ from, to, groupBy });

    return res.status(200).json({
      success: true,
      message: 'Lấy báo cáo doanh thu thành công.',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueReport
};