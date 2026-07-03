-- 修复 addresses 表的 user_id 外键约束问题
-- 1. 删除外键约束
-- 2. 将 user_id 改为可空
-- 3. 已存在的记录保持原样，新记录可以将 user_id 设为 NULL

USE clothing_shop;

-- 删除外键约束
ALTER TABLE addresses DROP FOREIGN KEY addresses_ibfk_1;

-- 删除 user_id 索引（如果存在）
ALTER TABLE addresses DROP INDEX idx_user_id;

-- 将 user_id 改为可空
ALTER TABLE addresses MODIFY COLUMN user_id INT NULL;

-- 为新记录设置默认值为 NULL
ALTER TABLE addresses ALTER COLUMN user_id SET DEFAULT NULL;

-- 为 user_phone 添加索引（如果没有的话）
ALTER TABLE addresses ADD INDEX idx_user_phone (user_phone);
