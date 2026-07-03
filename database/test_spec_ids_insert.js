require('dotenv').config();
const mysql = require('mysql2/promise');

async function testInsert() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('测试插入商品...\n');

    // 测试1: 插入带 spec_ids 的商品
    const testSql = `
      INSERT INTO products
      (category_id, spec_ids, name, subtitle, main_image, images, detail, price, original_price, cost_price, stock, sku_list, attributes, sort_order, status, is_hot, is_new, is_recommend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const testParams = [
      1,                                    // category_id
      '1,2,3',                             // spec_ids
      '测试商品_spec_ids',                  // name
      '测试副标题',                         // subtitle
      'https://example.com/image.jpg',     // main_image
      null,                                // images
      null,                                // detail
      99.99,                               // price
      199.99,                              // original_price
      50.00,                               // cost_price
      100,                                 // stock
      null,                                // sku_list
      null,                                // attributes
      0,                                   // sort_order
      1,                                   // status
      0,                                   // is_hot
      0,                                   // is_new
      0                                    // is_recommend
    ];

    console.log('SQL:', testSql);
    console.log('spec_ids 参数值:', testParams[1]);
    console.log('\n执行插入...\n');

    const [result] = await connection.query(testSql, testParams);
    console.log('✅ 插入成功!');
    console.log('insertId:', result.insertId);
    console.log('affectedRows:', result.affectedRows);

    // 查询验证
    console.log('\n验证查询...');
    const [rows] = await connection.query('SELECT id, category_id, spec_ids, name FROM products WHERE id = ?', [result.insertId]);

    if (rows.length > 0) {
      console.log('✅ 查询成功!');
      console.log('插入的数据:', rows[0]);

      // 清理测试数据
      await connection.query('DELETE FROM products WHERE id = ?', [result.insertId]);
      console.log('\n已清理测试数据');
    } else {
      console.log('❌ 查询失败，未找到插入的数据');
    }

    // 测试2: 尝试插入 null spec_ids
    console.log('\n\n测试2: 插入 null spec_ids');
    testParams[1] = null;
    const [result2] = await connection.query(testSql, testParams);
    console.log('✅ 插入成功! insertId:', result2.insertId);

    const [rows2] = await connection.query('SELECT id, spec_ids, name FROM products WHERE id = ?', [result2.insertId]);
    console.log('插入的数据:', rows2[0]);

    await connection.query('DELETE FROM products WHERE id = ?', [result2.insertId]);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    await connection.end();
  }
}

testInsert();
