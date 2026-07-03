require('dotenv').config();
const mysql = require('mysql2/promise');

async function addUserNumField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('开始添加 user_num 字段...\n');

    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'user_num'
    `, [process.env.DB_NAME || 'clothing_shop']);

    if (columns.length > 0) {
      console.log('ℹ️  user_num 字段已存在\n');

      // 显示字段信息
      const [fieldInfo] = await connection.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'user_num'
      `, [process.env.DB_NAME || 'clothing_shop']);

      console.log('字段信息:', fieldInfo[0]);
      return;
    }

    // 添加字段
    console.log('1. 添加 user_num 字段...');
    await connection.query('ALTER TABLE users ADD COLUMN user_num VARCHAR(7) NULL COMMENT "用户编号" AFTER phone');
    console.log('   ✅ user_num 字段已添加\n');

    // 添加唯一索引
    console.log('2. 添加唯一索引...');
    await connection.query('ALTER TABLE users ADD UNIQUE INDEX uk_user_num (user_num)');
    console.log('   ✅ 唯一索引已添加\n');

    // 验证结果
    const [updatedField] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'user_num'
    `, [process.env.DB_NAME || 'clothing_shop']);

    console.log('✅ 添加成功！');
    console.log('\n字段信息:');
    console.log(updatedField[0]);

  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('\n⚠️  user_num 字段或索引可能已存在');
    }
  } finally {
    await connection.end();
  }
}

addUserNumField();
