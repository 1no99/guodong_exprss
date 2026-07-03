require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkProductImagesFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('检查 products 表的图片字段');
    console.log('========================================\n');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME LIKE 'image%'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'clothing_shop']);

    if (columns.length === 0) {
      console.log('❌ 未找到 image 相关字段');
    } else {
      console.log(`✓ 找到 ${columns.length} 个图片相关字段：`);
      columns.forEach((col) => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_COMMENT || ''}`);
      });
    }

  } catch (error) {
    console.error('\n错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkProductImagesFields();
