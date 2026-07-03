const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/auth');
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');

// 所有订单路由都需要认证
router.post('/create', authMiddleware, [
  body('address_id').notEmpty().withMessage('请选择收货地址'),
  body('items').isArray({ min: 1 }).withMessage('请选择商品')
], validateMiddleware, OrderController.createOrder);

router.get('/list', authMiddleware, OrderController.getOrderList);
router.get('/detail', authMiddleware, OrderController.getOrderDetail);
router.get('/detail/:id', authMiddleware, OrderController.getOrderDetail);
router.get('/status/count', authMiddleware, OrderController.getOrderStatusCount);

// 管理员订单路由
router.get('/admin/all', authMiddleware, OrderController.getAllOrders);
router.get('/admin/:id', authMiddleware, OrderController.getOrderByAdmin);

// 公开接口（无需登录）
router.get('/public/:id', OrderController.getPublicOrderDetail);
router.post('/admin/create', authMiddleware, [
  body('username').notEmpty().withMessage('请输入用户名'),
  body('receiver_name').notEmpty().withMessage('请输入收货人'),
  body('receiver_phone').notEmpty().withMessage('请输入联系电话'),
  body('receiver_address').notEmpty().withMessage('请输入收货地址'),
  body('total_amount').notEmpty().withMessage('请输入订单金额'),
  body('items').isArray({ min: 1 }).withMessage('请选择商品')
], validateMiddleware, OrderController.createOrderByAdmin);
router.put('/admin/:id', authMiddleware, OrderController.updateOrderByAdmin);
router.put('/admin/:id/confirm-payment', authMiddleware, OrderController.confirmPayment);
router.put('/admin/:id/ship', authMiddleware, OrderController.shipOrder);

// 更新订单状态
router.put('/update-status', authMiddleware, OrderController.updateOrderStatus);

module.exports = router;
