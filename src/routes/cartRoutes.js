const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');

// 所有购物车路由都需要认证
router.get('/list', authMiddleware, CartController.getCartList);
router.post('/add', authMiddleware, [
  body('product_id').notEmpty().withMessage('商品ID不能为空')
], validateMiddleware, CartController.addToCart);
router.put('/item/:id', authMiddleware, [
  body('quantity').isInt({ min: 1 }).withMessage('数量必须大于0')
], validateMiddleware, CartController.updateCartItem);
router.delete('/item/:id', authMiddleware, CartController.removeFromCart);
router.delete('/batch', authMiddleware, [
  body('ids').isArray().withMessage('ids必须是数组')
], validateMiddleware, CartController.batchRemove);
router.delete('/clear', authMiddleware, CartController.clearCart);
router.get('/count', authMiddleware, CartController.getCartCount);

module.exports = router;
