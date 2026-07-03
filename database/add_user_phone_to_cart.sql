-- 添加 user_phone 字段到 cart 表
ALTER TABLE cart ADD COLUMN user_phone VARCHAR(20) DEFAULT NULL COMMENT '用户手机号';
ALTER TABLE cart ADD INDEX idx_user_phone (user_phone);

-- 为现有的 cart 数据填充 user_phone（如果有关联的 user）
UPDATE cart c
LEFT JOIN users u ON c.user_id = u.id
SET c.user_phone = u.phone
WHERE c.user_phone IS NULL AND u.phone IS NOT NULL;
