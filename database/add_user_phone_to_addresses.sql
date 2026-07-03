-- 为 addresses 表添加 user_phone 字段
-- 使用手机号作为用户标识，确保用户只能查询到自己的地址

ALTER TABLE addresses
ADD COLUMN user_phone VARCHAR(20) NOT NULL DEFAULT '' COMMENT '用户手机号' AFTER user_id,
ADD INDEX idx_user_phone (user_phone);

-- 为现有数据填充 user_phone（从 users 表关联更新）
UPDATE addresses a
INNER JOIN users u ON a.user_id = u.id
SET a.user_phone = u.phone
WHERE a.user_phone = '';
