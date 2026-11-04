const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');
const IpAccessController = require('../controllers/ipAccessController');

// 后台管理接口（需要登录认证）
router.get('/cities', authMiddleware, IpAccessController.getCities);

router.put(
  '/city/status',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('城市名称不能为空'),
    body('isOpen').isBoolean().withMessage('isOpen 必须是布尔值')
  ],
  validateMiddleware,
  IpAccessController.updateCityStatus
);

router.post('/refresh', authMiddleware, IpAccessController.refreshCache);

module.exports = router;
