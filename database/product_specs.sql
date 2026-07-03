-- 规格表（全局规格）
CREATE TABLE IF NOT EXISTS `specs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `spec_name` VARCHAR(50) NOT NULL COMMENT '规格名称，如：颜色、尺寸、重量等',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格表';

-- 规格值表
CREATE TABLE IF NOT EXISTS `spec_values` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `spec_id` INT NOT NULL COMMENT '规格ID',
  `spec_value` VARCHAR(100) NOT NULL COMMENT '规格值，如：红色、L、1kg等',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_spec_id` (`spec_id`),
  FOREIGN KEY (`spec_id`) REFERENCES `specs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格值表';

-- 商品规格关联表
CREATE TABLE IF NOT EXISTS `product_specs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT NOT NULL COMMENT '商品ID',
  `spec_id` INT NOT NULL COMMENT '规格ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_product_id` (`product_id`),
  INDEX `idx_spec_id` (`spec_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`spec_id`) REFERENCES `specs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格关联表';

-- 插入示例数据
INSERT INTO `specs` (`spec_name`, `sort_order`) VALUES
('颜色', 1),
('尺寸', 2),
('重量', 3);

INSERT INTO `spec_values` (`spec_id`, `spec_value`, `sort_order`) VALUES
(1, '红色', 1),
(1, '蓝色', 2),
(1, '黑色', 3),
(1, '白色', 4),
(2, 'S', 1),
(2, 'M', 2),
(2, 'L', 3),
(2, 'XL', 4),
(2, 'XXL', 5),
(3, '100g', 1),
(3, '200g', 2),
(3, '500g', 3);

-- 为商品ID为1的商品关联规格
INSERT INTO `product_specs` (`product_id`, `spec_id`) VALUES
(1, 1),
(1, 2);
