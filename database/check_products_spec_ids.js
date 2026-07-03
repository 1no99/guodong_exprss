require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkProducts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('检查商品表中的 spec_ids 字段\n');

    // 1. 检查最近创建的 5 个商品
    const [products] = await connection.query(`
      SELECT id, name, category_id, spec_ids, created_at
      FROM products
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('最近创建的 5 个商品:');
    console.log('----------------------------------------');
    products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`名称: ${p.name}`);
      console.log(`分类ID: ${p.category_id}`);
      console.log(`spec_ids: ${p.spec_ids}`);
      console.log(`创建时间: ${p.created_at}`);
      console.log('---');
    });

    // 2. 检查表结构
    console.log('\n表结构 (spec_ids 字段):');
    console.log('----------------------------------------');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'spec_ids'
    `, [process.env.DB_NAME || 'clothing_shop']);

    if (columns.length > 0) {
      console.log('✅ spec_ids 字段存在:');
      console.log(`  类型: ${columns[0].TYPE}`);
      console.log(`  可空: ${columns[0].IS_NULLABLE}`);
      console.log(`  默认值: ${columns[0].COLUMN_DEFAULT}`);
    } else {
      console.log('❌ spec_ids 字段不存在！');
    }

    console.log('\n========================================');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkProducts();
