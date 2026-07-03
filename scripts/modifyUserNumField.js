require('dotenv').config();
const mysql = require('mysql2/promise');

async function modifyUserNumField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('开始修改 user_num 字段...\n');

    // 删除旧的索引（如果有）
    console.log('1. 检查并删除旧索引...');
    try {
      await connection.query('ALTER TABLE users DROP INDEX user_num');
      console.log('   ✅ 旧索引已删除\n');
    } catch (err) {
      console.log('   ℹ️  没有找到名为 user_num 的索引\n');
    }

    // 删除唯一索引（如果有）
    console.log('2. 检查并删除唯一索引...');
    try {
      await connection.query('ALTER TABLE users DROP INDEX uk_user_num');
      console.log('   ✅ 唯一索引已删除\n');
    } catch (err) {
      console.log('   ℹ️  没有找到 uk_user_num 唯一索引\n');
    }

    // 修改字段类型
    console.log('3. 修改字段类型为 VARCHAR(7)...');
    await connection.query('ALTER TABLE users MODIFY COLUMN user_num VARCHAR(7) NULL');
    console.log('   ✅ 字段类型已修改\n');

    // 添加唯一索引
    console.log('4. 添加唯一索引...');
    await connection.query('ALTER TABLE users ADD UNIQUE INDEX uk_user_num (user_num)');
    console.log('   ✅ 唯一索引已添加\n');

    // 验证结果
    const [fieldInfo] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'user_num'
    `, [process.env.DB_NAME || 'clothing_shop']);

    console.log('✅ 修改成功！');
    console.log('\n字段信息:');
    console.log(fieldInfo[0]);

  } catch (error) {
    console.error('❌ 发生错误:', error.message);
  } finally {
    await connection.end();
  }
}

modifyUserNumField();
