require('dotenv').config();
const mysql = require('mysql2/promise');

async function initSimpleSpecsTable() {
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
    console.log('初始化简化的规格表');
    console.log('========================================\n');

    // 删除旧的规格相关表
    console.log('清理旧表...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS product_specs');
    await connection.query('DROP TABLE IF EXISTS spec_values');
    await connection.query('DROP TABLE IF EXISTS specs');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 创建简化的规格表（直接存储商品规格信息）
    console.log('创建 specs 表...');
    await connection.query(`
      CREATE TABLE specs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL COMMENT '商品ID',
        spec_name VARCHAR(50) NOT NULL COMMENT '规格名称，如：颜色、尺寸、重量等',
        spec_value VARCHAR(100) NOT NULL COMMENT '规格值，如：红色、L、100g等',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格表'
    `);

    // 插入示例数据（假设商品ID为1）
    console.log('插入示例数据...');
    await connection.query(`
      INSERT INTO specs (product_id, spec_name, spec_value, sort_order) VALUES
      (1, '颜色', '红色', 1),
      (1, '颜色', '蓝色', 2),
      (1, '颜色', '黑色', 3),
      (1, '尺寸', 'S', 4),
      (1, '尺寸', 'M', 5),
      (1, '尺寸', 'L', 6)
    `);

    console.log('✓ specs 表创建成功');
    console.log('✓ 示例数据插入成功');

    console.log('\n========================================');
    console.log('简化规格表初始化完成！');
    console.log('========================================\n');

    // 显示表结构
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME = 'specs'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('specs 表结构：');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_COMMENT || ''}`);
    });

    console.log('\n示例数据：');
    const [rows] = await connection.query('SELECT * FROM specs');
    rows.forEach(row => {
      console.log(`  商品${row.product_id}: ${row.spec_name} - ${row.spec_value}`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initSimpleSpecsTable();
