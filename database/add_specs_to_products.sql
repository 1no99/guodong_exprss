-- 在products表中添加规格字段
ALTER TABLE `products` ADD COLUMN `spec_ids` VARCHAR(500) DEFAULT NULL COMMENT '商品规格ID，多个用逗号分隔，如：1,2,3' AFTER `category_id`;

-- 更新现有数据（可选）
-- UPDATE `products` SET `spec_ids` = NULL WHERE `spec_ids` IS NULL;
