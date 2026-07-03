require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('检查数据库表');
    console.log('========================================\n');

    // 查询所有表名
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME LIKE '%spec%'
      ORDER BY TABLE_NAME
    `);

    if (tables.length === 0) {
      console.log('❌ 没有找到任何规格相关的表');
    } else {
      console.log('找到以下规格相关的表：');
      tables.forEach(table => {
        console.log(`  ✓ ${table.TABLE_NAME}`);
      });
    }

    // 检查是否有 spece 表（错误的表名）
    const [speceTable] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME = 'spece'
    `);

    if (speceTable.length > 0) {
      console.log('\n⚠️  发现错误的表名：spece');
      console.log('建议：应该使用 specs 表名');
    }

    // 检查 specs 表是否存在
    const [specsTable] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'clothing_shop'
      AND TABLE_NAME = 'specs'
    `);

    if (specsTable.length > 0) {
      console.log('\n✓ specs 表存在（正确的表名）');

      // 查看 specs 表的结构
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'clothing_shop'
        AND TABLE_NAME = 'specs'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('\nspecs 表结构：');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.COLUMN_COMMENT || ''}`);
      });
    } else {
      console.log('\n❌ specs 表不存在');
    }

  } catch (error) {
    console.error('\n错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();
