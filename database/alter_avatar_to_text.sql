-- 将avatar字段从VARCHAR(255)改为TEXT，以支持存储base64编码的头像数据
ALTER TABLE users MODIFY COLUMN avatar TEXT DEFAULT NULL COMMENT '头像(base64编码)';
