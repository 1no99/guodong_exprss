const DashboardModel = require('../models/dashboardModel');
const Response = require('../utils/response');

class DashboardController {
  /**
   * 获取统计数据
   */
  static async getStatistics(req, res) {
    try {
      const { start_time, end_time } = req.query;

      if (!start_time || !end_time) {
        return Response.error(res, '请提供时间范围', 400, 10001);
      }

      const statistics = await DashboardModel.getStatistics(start_time, end_time);

      return Response.success(res, statistics, '获取统计数据成功');
    } catch (error) {
      console.error('获取统计数据错误:', error);
      return Response.serverError(res, '获取统计数据失败');
    }
  }

  /**
   * 获取待处理订单列表（待付款订单）
   */
  static async getPendingOrders(req, res) {
    try {
      const { start_time, end_time, page = 1, pageSize = 10 } = req.query;

      const result = await DashboardModel.getPendingOrders(
        start_time || null,
        end_time || null,
        parseInt(page),
        parseInt(pageSize)
      );

      return Response.success(res, result, '获取待处理订单成功');
    } catch (error) {
      console.error('获取待处理订单错误:', error);
      return Response.serverError(res, '获取待处理订单失败');
    }
  }
}

module.exports = DashboardController;
