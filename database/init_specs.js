require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function initSpecsTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('========================================');
    console.log('开始初始化规格表...');
    console.log('========================================\n');

    // 先删除可能存在的旧表（注意顺序：先删除有外键的表）
    console.log('清理旧表...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS product_specs');
    await connection.query('DROP TABLE IF EXISTS spec_values');
    await connection.query('DROP TABLE IF EXISTS specs');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 创建规格表
    console.log('创建 specs 表...');
    await connection.query(`
      CREATE TABLE specs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        spec_name VARCHAR(50) NOT NULL COMMENT '规格名称，如：颜色、尺寸、重量等',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格表'
    `);

    // 创建规格值表
    console.log('创建 spec_values 表...');
    await connection.query(`
      CREATE TABLE spec_values (
        id INT PRIMARY KEY AUTO_INCREMENT,
        spec_id INT NOT NULL COMMENT '规格ID',
        spec_value VARCHAR(100) NOT NULL COMMENT '规格值，如：红色、L、1kg等',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_spec_id (spec_id),
        FOREIGN KEY (spec_id) REFERENCES specs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格值表'
    `);

    // 创建商品规格关联表
    console.log('创建 product_specs 表...');
    await connection.query(`
      CREATE TABLE product_specs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL COMMENT '商品ID',
        spec_id INT NOT NULL COMMENT '规格ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_spec_id (spec_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (spec_id) REFERENCES specs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格关联表'
    `);

    // 插入示例数据
    console.log('插入示例数据...');
    await connection.query(`
      INSERT INTO specs (spec_name, sort_order) VALUES
      ('颜色', 1),
      ('尺寸', 2),
      ('重量', 3)
    `);

    await connection.query(`
      INSERT INTO spec_values (spec_id, spec_value, sort_order) VALUES
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
      (3, '500g', 3)
    `);

    console.log('✓ specs 表创建成功');
    console.log('✓ spec_values 表创建成功');
    console.log('✓ product_specs 表创建成功');
    console.log('✓ 示例数据插入成功');

    console.log('\n========================================');
    console.log('规格表初始化完成！');
    console.log('========================================\n');

    // 显示插入的示例数据
    const [specs] = await connection.query('SELECT * FROM specs');
    console.log('已创建的规格：');
    specs.forEach(spec => {
      console.log(`  - ${spec.spec_name} (ID: ${spec.id})`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initSpecsTables();
