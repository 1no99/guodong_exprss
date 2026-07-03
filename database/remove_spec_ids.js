require('dotenv').config();
const mysql = require('mysql2/promise');

async function removeSpecIdsColumn() {
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
    console.log('删除 products 表的 spec_ids 字段');
    console.log('========================================\n');

    // 检查字段是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'spec_ids'
    `);

    if (columns.length === 0) {
      console.log('[提示] spec_ids 字段不存在，无需删除');
      return;
    }

    // 删除 spec_ids 字段
    console.log('正在删除 spec_ids 字段...');
    await connection.query('ALTER TABLE products DROP COLUMN spec_ids');

    console.log('\n✓ 成功删除 products.spec_ids 字段');
    console.log('\n========================================');
    console.log('现在统一使用 product_specs 关联表');
    console.log('========================================\n');

    // 显示当前商品与规格的关联情况
    const [relations] = await connection.query(`
      SELECT p.id as product_id, p.name as product_name, COUNT(ps.spec_id) as spec_count
      FROM products p
      LEFT JOIN product_specs ps ON p.id = ps.product_id
      GROUP BY p.id, p.name
      ORDER BY spec_count DESC
      LIMIT 5
    `);

    console.log('商品规格关联示例：');
    relations.forEach(row => {
      console.log(`  商品: ${row.product_name} (${row.product_id}) - 关联 ${row.spec_count} 个规格`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

removeSpecIdsColumn();
