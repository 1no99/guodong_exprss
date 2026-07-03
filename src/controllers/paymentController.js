const OrderModel = require('../models/orderModel');
const Response = require('../utils/response');

class PaymentController {
  /**
   * 支付订单
   */
  static async payOrder(req, res) {
    try {
      const { order_no, pay_type } = req.body;

      // 验证参数
      if (!order_no) {
        return Response.validateError(res, '订单号不能为空');
      }

      if (!pay_type) {
        return Response.validateError(res, '支付方式不能为空');
      }

      // 查询订单
      const order = await OrderModel.findByOrderNo(order_no);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      // 验证是否是当前用户的订单
      if (order.user_id !== req.user.id) {
        return Response.forbidden(res, '无权操作该订单');
      }

      // 检查订单状态
      if (order.order_status !== 0) {
        return Response.error(res, '该订单已支付或状态异常', 400, 6003);
      }

      // 检查支付状态
      if (order.pay_status === 1) {
        return Response.error(res, '该订单已支付', 400, 6004);
      }

      // 更新支付状态
      await OrderModel.updatePayStatus(order_no, pay_type);

      // 获取更新后的订单详情
      const updatedOrder = await OrderModel.getDetailWithItems(order.id);

      return Response.success(res, updatedOrder, '支付成功');
    } catch (error) {
      console.error('支付订单错误:', error);
      return Response.serverError(res, '支付失败');
    }
  }
}

module.exports = PaymentController;
