const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function addUserPhoneField() {
  try {
    console.log('开始添加 user_phone 字段...');

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, 'add_user_phone_to_addresses.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 分割 SQL 语句（按分号分隔）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 执行每条 SQL 语句
    for (const statement of statements) {
      console.log('执行 SQL:', statement.substring(0, 100) + '...');
      await db.query(statement);
    }

    console.log('✓ user_phone 字段添加成功！');

    // 验证字段是否添加成功
    const [columns] = await db.query('SHOW COLUMNS FROM addresses LIKE "user_phone"');
    if (columns.length > 0) {
      console.log('✓ 字段验证成功:', columns[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('× 添加字段失败:', error.message);
    process.exit(1);
  }
}

addUserPhoneField();
