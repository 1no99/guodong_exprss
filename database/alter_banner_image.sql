-- 修改轮播图表的 image 字段类型，支持存储更长的数据（如 base64 图片）
ALTER TABLE banners MODIFY COLUMN image TEXT NOT NULL COMMENT '图片';
