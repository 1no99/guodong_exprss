const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const AddressController = require('../controllers/addressController');
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');

// 用户认证相关路由
router.post('/login/wechat', [
  body('code').notEmpty().withMessage('code不能为空')
], validateMiddleware, UserController.wechatLogin);

router.post('/register', [
  body('phone').isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('username').notEmpty().withMessage('用户名不能为空')
], validateMiddleware, UserController.register);

router.post('/login', [
  body('password').notEmpty().withMessage('密码不能为空'),
  body('username').optional(),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确')
    .withMessage('请输入用户名或手机号')
], validateMiddleware, UserController.login);

// 用户信息相关路由（需要认证）
router.get('/info', authMiddleware, UserController.getUserInfo);
router.put('/info', authMiddleware, UserController.updateUserInfo);
router.post('/bindPhone', [
  body('phone').isMobilePhone('zh-CN').withMessage('手机号格式不正确')
], validateMiddleware, authMiddleware, UserController.bindPhone);

// 根据手机号获取用户信息（需要认证）
router.get('/info/by-phone', authMiddleware, UserController.getUserInfoByPhone);

// 地址相关路由（使用手机号作为标识，不需要认证）
router.get('/address', AddressController.getAddressList);
router.get('/address/:id', AddressController.getAddressDetail);
router.post('/address', AddressController.createAddress);
router.put('/address/:id', AddressController.updateAddress);
router.delete('/address/:id', AddressController.deleteAddress);
router.put('/address/:id/default', AddressController.setDefaultAddress);

// ============ 管理员用户管理接口 ============
router.get('/admin/users', authMiddleware, UserController.getUserList);
router.post('/admin/users', authMiddleware, UserController.createUser);
router.put('/admin/users/:id', authMiddleware, UserController.updateUserByAdmin);
router.delete('/admin/users/:id', authMiddleware, UserController.deleteUserByAdmin);
router.put('/admin/users/:id/status', authMiddleware, UserController.toggleUserStatus);
router.put('/admin/users/:id/password', authMiddleware, UserController.resetUserPassword);

module.exports = router;
