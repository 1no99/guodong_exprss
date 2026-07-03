-- 修改轮播图表的 image 字段为 MEDIUMTEXT，支持更大的数据（最大 16MB）
USE clothing_shop;
ALTER TABLE banners MODIFY COLUMN image MEDIUMTEXT NOT NULL COMMENT '图片';
