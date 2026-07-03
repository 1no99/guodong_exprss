require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSpecsData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('检查 specs 表数据');
    console.log('========================================\n');

    const [rows] = await connection.query('SELECT * FROM specs ORDER BY sort_order');

    console.log(`总记录数: ${rows.length}\n`);

    console.log('specs 表数据：');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID:${row.id}, ${row.spec_name} (排序:${row.sort_order})`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkSpecsData();
