-- 创建数据库
CREATE DATABASE IF NOT EXISTS clothing_shop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clothing_shop;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE COMMENT '微信openid',
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  password VARCHAR(255) COMMENT '密码(手机号注册时使用)',
  phone VARCHAR(20) UNIQUE COMMENT '手机号',
  avatar VARCHAR(255) DEFAULT '/default-avatar.png' COMMENT '头像',
  nickname VARCHAR(50) COMMENT '昵称',
  gender TINYINT DEFAULT 0 COMMENT '性别:0未知,1男,2女',
  birthday DATE COMMENT '生日',
  points INT DEFAULT 0 COMMENT '积分',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '余额',
  status TINYINT DEFAULT 1 COMMENT '状态:0禁用,1正常',
  last_login_time DATETIME COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  receiver_name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
  receiver_phone VARCHAR(20) NOT NULL COMMENT '收货人电话',
  province VARCHAR(50) NOT NULL COMMENT '省份',
  city VARCHAR(50) NOT NULL COMMENT '城市',
  district VARCHAR(50) NOT NULL COMMENT '区/县',
  detail_address VARCHAR(200) NOT NULL COMMENT '详细地址',
  postal_code VARCHAR(10) COMMENT '邮政编码',
  is_default TINYINT DEFAULT 0 COMMENT '是否默认:0否,1是',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址表';

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT DEFAULT 0 COMMENT '父分类ID,0为顶级分类',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  icon VARCHAR(255) COMMENT '分类图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态:0禁用,1启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL COMMENT '分类ID',
  name VARCHAR(100) NOT NULL COMMENT '商品名称',
  subtitle VARCHAR(200) COMMENT '副标题',
  main_image VARCHAR(255) COMMENT '主图',
  images TEXT COMMENT '商品图片(JSON数组)',
  detail TEXT COMMENT '商品详情(HTML)',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  original_price DECIMAL(10,2) COMMENT '原价',
  cost_price DECIMAL(10,2) COMMENT '成本价',
  stock INT DEFAULT 0 COMMENT '库存',
  sales INT DEFAULT 0 COMMENT '销量',
  sku_list TEXT COMMENT 'SKU列表(JSON)',
  attributes TEXT COMMENT '商品属性(JSON)',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态:0下架,1上架',
  is_hot TINYINT DEFAULT 0 COMMENT '是否热销:0否,1是',
  is_new TINYINT DEFAULT 0 COMMENT '是否新品:0否,1是',
  is_recommend TINYINT DEFAULT 0 COMMENT '是否推荐:0否,1是',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order),
  FULLTEXT idx_name_subtitle (name, subtitle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 购物车表
CREATE TABLE IF NOT EXISTS cart (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  sku_id VARCHAR(50) COMMENT 'SKU ID',
  quantity INT DEFAULT 1 COMMENT '数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_product (user_id, product_id, sku_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '订单编号',
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  pay_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  pay_type VARCHAR(20) COMMENT '支付方式:wechat,alipay,balance',
  pay_time DATETIME COMMENT '支付时间',
  pay_status TINYINT DEFAULT 0 COMMENT '支付状态:0未支付,1已支付,2已退款',
  order_status TINYINT DEFAULT 0 COMMENT '订单状态:0待付款,1待发货,2待收货,3已完成,4已取消,5退款中,6已退款',
  receiver_name VARCHAR(50) NOT NULL COMMENT '收货人',
  receiver_phone VARCHAR(20) NOT NULL COMMENT '收货电话',
  receiver_address VARCHAR(500) NOT NULL COMMENT '收货地址',
  express_company VARCHAR(50) COMMENT '快递公司',
  express_no VARCHAR(50) COMMENT '快递单号',
  express_time DATETIME COMMENT '发货时间',
  finish_time DATETIME COMMENT '完成时间',
  cancel_time DATETIME COMMENT '取消时间',
  cancel_reason VARCHAR(200) COMMENT '取消原因',
  remark VARCHAR(500) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_order_no (order_no),
  INDEX idx_user_id (user_id),
  INDEX idx_order_status (order_status),
  INDEX idx_pay_status (pay_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单商品表
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL COMMENT '商品名称',
  product_image VARCHAR(255) COMMENT '商品图片',
  sku_id VARCHAR(50) COMMENT 'SKU ID',
  sku_name VARCHAR(100) COMMENT 'SKU名称',
  price DECIMAL(10,2) NOT NULL COMMENT '商品单价',
  quantity INT NOT NULL COMMENT '购买数量',
  total_price DECIMAL(10,2) NOT NULL COMMENT '总价',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单商品表';

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_product (user_id, product_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表';

-- 轮播图表
CREATE TABLE IF NOT EXISTS banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) COMMENT '标题',
  image VARCHAR(255) NOT NULL COMMENT '图片',
  link_type TINYINT DEFAULT 0 COMMENT '链接类型:0无,1商品,2分类,3外链',
  link_value VARCHAR(200) COMMENT '链接值',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态:0禁用,1启用',
  start_time DATETIME COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sort_order (sort_order),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播图表';

-- 插入默认分类数据
INSERT INTO categories (name, icon, sort_order) VALUES
('男装', '/images/categories/men.png', 1),
('女装', '/images/categories/women.png', 2),
('童装', '/images/categories/kids.png', 3),
('运动', '/images/categories/sport.png', 4),
('配饰', '/images/categories/accessories.png', 5);

-- 插入测试商品数据
INSERT INTO products (category_id, name, subtitle, main_image, price, original_price, stock, status, is_hot, is_new) VALUES
(1, '男士纯棉T恤', '舒适透气，夏季必备', '/images/products/tshirt-men.jpg', 89.00, 159.00, 100, 1, 1, 1),
(2, '女士连衣裙', '优雅修身，百搭时尚', '/images/products/dress.jpg', 199.00, 399.00, 50, 1, 1, 1),
(3, '儿童运动套装', '健康舒适，活力满满', '/images/products/kids-sport.jpg', 129.00, 199.00, 80, 1, 0, 1);

-- 插入默认轮播图
INSERT INTO banners (title, image, link_type, link_value, sort_order) VALUES
('春季新品上市', '/images/banners/spring.jpg', 0, '', 1),
('限时优惠活动', '/images/banners/sale.jpg', 0, '', 2),
('夏季清仓大促', '/images/banners/clearance.jpg', 0, '', 3);
