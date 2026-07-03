require('dotenv').config();
const mysql = require('mysql2/promise');

async function addProductDetailImages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('添加商品详情图字段支持');
    console.log('========================================\n');

    // 检查是否已经有这些字段
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME IN ('images1', 'images2', 'images3', 'images4', 'images5')
    `, [process.env.DB_NAME || 'clothing_shop']);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);
    const neededColumns = ['images1', 'images2', 'images3', 'images4', 'images5'];
    const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('✓ products 表已经有所有详情图字段，无需修改');
      return;
    }

    // 添加缺失的字段
    console.log('正在添加缺失的字段...');

    for (const column of missingColumns) {
      await connection.query(`
        ALTER TABLE products
        ADD COLUMN ${column} TEXT DEFAULT NULL COMMENT '商品详情图${column.slice(-1)}'
      `);
      console.log(`✓ 添加 ${column} 字段`);
    }

    console.log('\n========================================');
    console.log('商品详情图字段添加完成！');
    console.log('========================================\n');

    // 显示更新后的表结构
    const [tableColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME LIKE 'images%'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'clothing_shop']);

    console.log('更新后的详情图字段：');
    tableColumns.forEach((col) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_COMMENT || ''}`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addProductDetailImages();
