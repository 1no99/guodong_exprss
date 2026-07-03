require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetSpecsData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('重置 specs 表数据');
    console.log('========================================\n');

    // 清空表
    console.log('清空 specs 表...');
    await connection.query('DELETE FROM specs');
    console.log('✓ 表已清空');

    // 插入4条示例数据
    console.log('\n插入4条示例数据...');
    await connection.query(`
      INSERT INTO specs (product_id, spec_name, spec_value, sort_order) VALUES
      (1, '颜色', '红色', 1),
      (1, '颜色', '蓝色', 2),
      (1, '尺寸', 'S', 3),
      (1, '尺寸', 'M', 4)
    `);
    console.log('✓ 已插入4条数据');

    // 显示插入的数据
    const [rows] = await connection.query('SELECT * FROM specs ORDER BY sort_order');
    console.log('\n当前数据：');
    rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.spec_name}: ${row.spec_value} (排序:${row.sort_order})`);
    });

    console.log('\n========================================');
    console.log('重置完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n错误:', error.message);
  } finally {
    await connection.end();
  }
}

resetSpecsData();
