require('dotenv').config();
const mysql = require('mysql2/promise');

async function alterSpecsTable() {
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
    console.log('修改 specs 表结构');
    console.log('========================================\n');

    // 删除旧表并重新创建
    console.log('删除旧表...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS specs');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 创建新的简化的 specs 表
    console.log('创建新的 specs 表...');
    await connection.query(`
      CREATE TABLE specs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        spec_name VARCHAR(50) NOT NULL COMMENT '规格名称，如：颜色、尺寸、材质等',
        sort_order INT DEFAULT 0 COMMENT '排序顺序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格类型表'
    `);

    console.log('✓ specs 表创建成功');

    // 插入示例数据（只保留规格类型）
    console.log('\n插入示例数据...');
    await connection.query(`
      INSERT INTO specs (spec_name, sort_order) VALUES
      ('颜色', 1),
      ('尺寸', 2),
      ('材质', 3)
    `);

    console.log('✓ 示例数据插入成功');

    // 显示表结构
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME = 'specs'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n========================================');
    console.log('specs 表结构：');
    console.log('========================================');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_COMMENT || ''}`);
    });

    // 显示数据
    const [rows] = await connection.query('SELECT * FROM specs ORDER BY sort_order');
    console.log('\n========================================');
    console.log('当前数据：');
    console.log('========================================');
    rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.spec_name} (排序:${row.sort_order})`);
    });

    console.log('\n✓ 修改完成！');

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

alterSpecsTable();
