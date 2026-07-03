require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 增加 JSON 请求体大小限制
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // 增加 URL 编码请求体大小限制

// 静态文件服务
app.use('/uploads', express.static('uploads'));
app.use('/sysimg', express.static('uploads/sysimg'));

// API路由
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/product', require('./routes/productRoutes'));
app.use('/api/product-spec', require('./routes/productSpecRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/order', require('./routes/orderRoutes'));
app.use('/api/banner', require('./routes/bannerRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// 兼容旧版轮播图接口
app.get('/api/banner/list', require('./controllers/bannerController').getBannerList);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务正常运行' });
});

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: '衣服商城API',
    version: '1.0.0',
    endpoints: {
      user: '/api/user',
      product: '/api/product',
      cart: '/api/cart',
      order: '/api/order',
      banner: '/api/banner'
    }
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API地址: http://localhost:${PORT}/api`);
  console.log(`=================================`);
});

module.exports = app;
