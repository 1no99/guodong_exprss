# 衣服商城小程序后端 API

基于 Express + MySQL 构建的衣服商城小程序后端服务。

## 功能特性

- ✅ 用户管理（微信授权登录、手机号注册登录）
- ✅ 商品管理（商品列表、详情、分类、搜索）
- ✅ 购物车（添加、删除、修改数量）
- ✅ 订单系统（下单、支付、状态管理、退款）
- ✅ 收货地址管理
- ✅ 商品收藏
- ✅ 轮播图

## 技术栈

- **框架**: Express.js
- **数据库**: MySQL
- **认证**: JWT
- **其他**: bcryptjs、axios、express-validator

## 项目结构

```
gdexpress/
├── database/              # 数据库相关
│   ├── schema.sql        # 数据库表结构SQL
│   └── init.js           # 数据库初始化脚本
├── src/
│   ├── config/           # 配置文件
│   │   ├── database.js   # 数据库连接配置
│   │   └── jwt.js        # JWT配置
│   ├── controllers/      # 控制器
│   │   ├── userController.js
│   │   ├── addressController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── favoriteController.js
│   │   └── bannerController.js
│   ├── models/           # 数据模型
│   │   ├── userModel.js
│   │   ├── addressModel.js
│   │   ├── productModel.js
│   │   ├── categoryModel.js
│   │   ├── cartModel.js
│   │   ├── orderModel.js
│   │   ├── favoriteModel.js
│   │   └── bannerModel.js
│   ├── routes/           # 路由
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── cartRoutes.js
│   │   └── orderRoutes.js
│   ├── middleware/       # 中间件
│   │   ├── auth.js       # 认证中间件
│   │   ├── validate.js   # 验证中间件
│   │   └── errorHandler.js
│   ├── utils/            # 工具函数
│   │   ├── response.js   # 统一响应格式
│   │   └── pagination.js # 分页工具
│   └── app.js            # 应用入口
├── .env                  # 环境变量
├── .env.example          # 环境变量示例
├── package.json          # 依赖配置
└── README.md             # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并修改相关配置：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=clothing_shop

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
```

### 3. 初始化数据库

确保 MySQL 服务已启动，然后执行：

```bash
npm run init-db
```

这将创建数据库、表结构，并插入测试数据。

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 接口文档

### 基础响应格式

**成功响应：**
```json
{
  "code": 0,
  "message": "操作成功",
  "data": { }
}
```

**失败响应：**
```json
{
  "code": 1001,
  "message": "错误信息",
  "data": null
}
```

### 用户相关接口

#### 微信小程序登录
```
POST /api/user/login/wechat
Content-Type: application/json

{
  "code": "微信登录code",
  "userInfo": {
    "nickname": "用户昵称",
    "avatar": "头像URL",
    "gender": 1
  }
}
```

#### 手机号注册
```
POST /api/user/register
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "123456",
  "username": "用户名"
}
```

#### 手机号登录
```
POST /api/user/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "123456"
}
```

#### 获取用户信息
```
GET /api/user/info
Headers: Authorization: Bearer {token}
```

#### 更新用户信息
```
PUT /api/user/info
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar": "头像URL"
}
```

### 地址相关接口

#### 获取地址列表
```
GET /api/user/address
Headers: Authorization: Bearer {token}
```

#### 创建地址
```
POST /api/user/address
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "receiver_name": "收货人姓名",
  "receiver_phone": "13800138000",
  "province": "广东省",
  "city": "深圳市",
  "district": "南山区",
  "detail_address": "详细地址",
  "postal_code": "518000",
  "is_default": 1
}
```

### 商品相关接口

#### 获取商品列表
```
GET /api/product/list?category_id=1&page=1&pageSize=10
```

#### 获取商品详情
```
GET /api/product/detail/:id
```

#### 搜索商品
```
GET /api/product/search?keyword=连衣裙&page=1&pageSize=10
```

#### 获取分类列表
```
GET /api/product/category/list
```

#### 获取分类树
```
GET /api/product/category/tree
```

### 购物车相关接口

#### 获取购物车列表
```
GET /api/cart/list
Headers: Authorization: Bearer {token}
```

#### 添加到购物车
```
POST /api/cart/add
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": 1,
  "sku_id": "SKU001",
  "quantity": 2
}
```

#### 更新购物车商品数量
```
PUT /api/cart/item/:id
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 3
}
```

#### 删除购物车商品
```
DELETE /api/cart/item/:id
Headers: Authorization: Bearer {token}
```

#### 清空购物车
```
DELETE /api/cart/clear
Headers: Authorization: Bearer {token}
```

### 订单相关接口

#### 创建订单
```
POST /api/order/create
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "address_id": 1,
  "items": [
    {
      "product_id": 1,
      "sku_id": "SKU001",
      "quantity": 2,
      "cart_id": 10
    }
  ],
  "remark": "备注信息"
}
```

#### 获取订单列表
```
GET /api/order/list?order_status=0&page=1&pageSize=10
Headers: Authorization: Bearer {token}
```

订单状态：
- 0: 待付款
- 1: 待发货
- 2: 待收货
- 3: 已完成
- 4: 已取消
- 5: 退款中
- 6: 已退款

#### 获取订单详情
```
GET /api/order/detail/:id
Headers: Authorization: Bearer {token}
```

#### 取消订单
```
PUT /api/order/cancel/:id
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "取消原因"
}
```

#### 确认收货
```
PUT /api/order/confirm/:id
Headers: Authorization: Bearer {token}
```

### 其他接口

#### 获取轮播图
```
GET /api/banner
```

#### 获取收藏列表
```
GET /api/product/favorite/list
Headers: Authorization: Bearer {token}
```

#### 添加收藏
```
POST /api/product/favorite/add
Headers: Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": 1
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未授权 |
| 1003 | 禁止访问 |
| 1004 | 资源不存在 |
| 1005 | 服务器错误 |
| 2001 | 数据已存在 |
| 3001 | 手机号已注册 |
| 3002 | 用户不存在 |
| 3003 | 密码错误 |
| 3004 | 账号已被禁用 |
| 4001 | 已收藏 |
| 5001 | 商品已下架 |
| 5002 | 库存不足 |
| 6001 | 商品已下架 |
| 6002 | 库存不足 |
| 6003 | 订单无法取消 |
| 6004 | 无法确认收货 |
| 6005 | 订单无法删除 |

## 数据库表说明

### users (用户表)
存储用户基本信息，包括微信用户和手机号注册用户。

### addresses (收货地址表)
存储用户收货地址信息。

### categories (商品分类表)
存储商品分类信息，支持多级分类。

### products (商品表)
存储商品信息，包括价格、库存、SKU等。

### cart (购物车表)
存储用户购物车数据。

### orders (订单表)
存储订单基本信息。

### order_items (订单商品表)
存储订单包含的商品信息。

### favorites (收藏表)
存储用户收藏的商品。

### banners (轮播图表)
存储轮播图信息。

## 开发建议

1. 使用 Postman 或 Apifox 测试接口
2. 开发环境建议使用 nodemon 自动重启
3. 生产环境请修改 JWT_SECRET 为复杂密钥
4. 建议配置 HTTPS
5. 可以添加 Redis 缓存提升性能
6. 可以添加日志系统（如 Winston）

## 许可证

MIT
"# guodong_exprss" 
