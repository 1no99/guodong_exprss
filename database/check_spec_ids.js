require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAndAddSpecIdsColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('已连接到数据库:', process.env.DB_NAME || 'clothing_shop');

    // 检查 spec_ids 字段是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'spec_ids'
    `, [process.env.DB_NAME || 'clothing_shop']);

    if (columns.length === 0) {
      console.log('⚠️  spec_ids 字段不存在，正在添加...');

      await connection.query(`
        ALTER TABLE products
        ADD COLUMN spec_ids VARCHAR(500) DEFAULT NULL
        COMMENT '商品规格ID，多个用逗号分隔，如：1,2,3'
        AFTER category_id
      `);

      console.log('✅ spec_ids 字段添加成功！');
    } else {
      console.log('✅ spec_ids 字段已存在');
    }

    // 显示当前表结构
    const [tableDesc] = await connection.query('DESCRIBE products');
    console.log('\n当前 products 表结构:');
    tableDesc.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkAndAddSpecIdsColumn();
