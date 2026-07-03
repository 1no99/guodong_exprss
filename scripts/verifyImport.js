require('dotenv').config();
const mysql = require('mysql2/promise');

async function verifyImport() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('验证导入的商品数据...\n');
    console.log('========================================\n');

    // 查询最新导入的 15 条商品
    const [products] = await connection.query(`
      SELECT id, name, subtitle, price, stock, status, created_at
      FROM products
      WHERE category_id = 12
      ORDER BY created_at DESC
      LIMIT 15
    `);

    console.log(`找到 ${products.length} 条商品记录:\n`);

    products.forEach((product, index) => {
      console.log(`${index + 1}. [ID: ${product.id}] ${product.name}`);
      console.log(`   简介: ${product.subtitle}`);
      console.log(`   价格: ¥${product.price} | 库存: ${product.stock} | 状态: ${product.status === 1 ? '上架' : '下架'}`);
      console.log(`   创建时间: ${product.created_at}`);
      console.log('');
    });

    console.log('========================================');
    console.log(`✅ 验证完成！共导入 ${products.length} 条商品数据\n`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

verifyImport();
