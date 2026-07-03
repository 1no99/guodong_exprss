const express = require('express');
const router = express.Router();
const BannerController = require('../controllers/bannerController');
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');

// 前台接口（无需登录）
router.get('/list', BannerController.getBannerList);

// 后台管理接口（需要登录认证）
router.get('/admin/all', authMiddleware, BannerController.getAllBanners);
router.get('/admin/:id', authMiddleware, BannerController.getBannerDetail);
router.post('/admin', authMiddleware, [
  body('image').notEmpty().withMessage('图片不能为空')
], validateMiddleware, BannerController.createBanner);
router.put('/admin/:id', authMiddleware, BannerController.updateBanner);
router.delete('/admin/:id', authMiddleware, BannerController.deleteBanner);
router.put('/admin/:id/status', authMiddleware, [
  body('status').isIn([0, 1]).withMessage('状态值不正确')
], validateMiddleware, BannerController.updateBannerStatus);

module.exports = router;
