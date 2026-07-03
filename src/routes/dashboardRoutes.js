const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// 所有dashboard路由都需要认证
router.get('/statistics', authMiddleware, DashboardController.getStatistics);
router.get('/pending-orders', authMiddleware, DashboardController.getPendingOrders);

module.exports = router;
