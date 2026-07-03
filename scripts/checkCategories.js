require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAndCreateCategory() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('检查分类数据...\n');

    // 查询所有分类
    const [categories] = await connection.query('SELECT * FROM categories ORDER BY id');

    console.log(`当前共有 ${categories.length} 个分类:\n`);

    if (categories.length === 0) {
      console.log('❌ 没有找到任何分类！\n');
      console.log('创建默认分类...\n');

      // 创建默认分类
      const [result] = await connection.query(`
        INSERT INTO categories (name, icon, parent_id, sort_order, status)
        VALUES ('默认分类', '', 0, 0, 1)
      `);

      console.log(`✅ 已创建默认分类，ID: ${result.insertId}\n`);

      return result.insertId;
    } else {
      categories.forEach(cat => {
        console.log(`ID: ${cat.id} - ${cat.name}`);
      });

      console.log('\n使用第一个分类作为导入分类\n');
      return categories[0].id;
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkAndCreateCategory();
