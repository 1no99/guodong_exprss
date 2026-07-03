const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const CategoryController = require('../controllers/categoryController');
const FavoriteController = require('../controllers/favoriteController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { body } = require('express-validator');
const validateMiddleware = require('../middleware/validate');

// 商品相关路由（可选认证）
router.get('/list', optionalAuth, ProductController.getProductList);
router.get('/detail/:id', optionalAuth, ProductController.getProductDetail);
router.get('/search', optionalAuth, ProductController.searchProducts);

// 分类相关路由（无需认证）
router.get('/category/list', CategoryController.getCategoryList);
router.get('/category/tree', CategoryController.getCategoryTree);
router.get('/category/:id', CategoryController.getCategoryDetail);

// 分类管理路由（需要登录认证）
router.get('/category/admin/all', authMiddleware, CategoryController.getAllCategories);
router.post('/category/admin', authMiddleware, [
  body('name').notEmpty().withMessage('分类名称不能为空')
], validateMiddleware, CategoryController.createCategory);
router.put('/category/admin/:id', authMiddleware, CategoryController.updateCategory);
router.delete('/category/admin/:id', authMiddleware, CategoryController.deleteCategory);

// 商品管理路由（需要登录认证）
router.get('/admin/all', authMiddleware, ProductController.getAllProducts);
router.get('/admin/:id', authMiddleware, ProductController.getProductDetail);
router.post('/admin', authMiddleware, [
  body('name').notEmpty().withMessage('商品名称不能为空'),
  body('category_id').notEmpty().withMessage('分类不能为空'),
  body('main_image').notEmpty().withMessage('商品图片不能为空')
], validateMiddleware, ProductController.createProduct);
router.put('/admin/:id', authMiddleware, ProductController.updateProduct);
router.delete('/admin/:id', authMiddleware, ProductController.deleteProduct);
router.put('/admin/:id/status', authMiddleware, [
  body('status').isIn([0, 1]).withMessage('状态值不正确')
], validateMiddleware, ProductController.updateProductStatus);

// 收藏相关路由（需要认证）
router.get('/favorite/list', authMiddleware, FavoriteController.getFavoriteList);
router.post('/favorite/add', authMiddleware, [
  body('product_id').notEmpty().withMessage('商品ID不能为空')
], validateMiddleware, FavoriteController.addFavorite);
router.delete('/favorite/:product_id', authMiddleware, FavoriteController.removeFavorite);
router.get('/favorite/check/:product_id', authMiddleware, FavoriteController.checkFavorite);

module.exports = router;
