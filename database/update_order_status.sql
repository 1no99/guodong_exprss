-- 简化订单状态注释
USE clothing_shop;

ALTER TABLE orders
MODIFY COLUMN order_status TINYINT DEFAULT 0
COMMENT '订单状态:0待付款,1已付款待发货,2已发货';

-- 说明：
-- 0: 待付款 - 用户下单未支付
-- 1: 已付款待发货 - 用户已支付，等待商家发货
-- 2: 已发货 - 商家已发货，订单完成
