const express = require('express');
const router = express.Router();
const ProductSpecController = require('../controllers/productSpecController');
const { authMiddleware } = require('../middleware/auth');

// 获取所有规格类型列表 - 公开接口，不需要登录
router.get('/', ProductSpecController.getAll);

// 以下路由需要认证
router.use(authMiddleware);

// 创建规格类型
router.post('/', ProductSpecController.validateCreate, ProductSpecController.create);

// 更新规格类型
router.put('/:id', ProductSpecController.validateCreate, ProductSpecController.update);

// 删除规格类型
router.delete('/:id', ProductSpecController.delete);

module.exports = router;
