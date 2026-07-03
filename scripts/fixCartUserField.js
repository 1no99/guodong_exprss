require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixCartUserField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('开始修复 cart 表的 user_id 字段...\n');

    // 查看当前表结构
    console.log('当前 cart 表结构（user_id 相关）:');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'cart'
      AND COLUMN_NAME IN ('user_id', 'user_phone')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'clothing_shop']);
    console.log(columns);
    console.log('');

    // 1. 删除外键约束
    console.log('1. 尝试删除外键约束...');
    try {
      await connection.query('ALTER TABLE cart DROP FOREIGN KEY cart_ibfk_1');
      console.log('   ✅ 外键约束已删除\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  外键约束可能不存在或已删除\n');
      } else {
        console.log('   ⚠️  错误:', err.message, '\n');
      }
    }

    // 2. 删除 user_id 相关的索引
    console.log('2. 尝试删除 user_id 索引...');
    try {
      await connection.query('ALTER TABLE cart DROP INDEX idx_user_id');
      console.log('   ✅ idx_user_id 索引已删除\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  idx_user_id 索引可能不存在\n');
      } else {
        console.log('   ⚠️  错误:', err.message, '\n');
      }
    }

    // 3. 删除旧的唯一约束
    console.log('3. 尝试删除旧的唯一约束...');
    try {
      await connection.query('ALTER TABLE cart DROP INDEX uk_user_product');
      console.log('   ✅ uk_user_product 唯一约束已删除\n');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  uk_user_product 唯一约束可能不存在\n');
      } else {
        console.log('   ⚠️  错误:', err.message, '\n');
      }
    }

    // 4. 修改 user_id 为可空
    console.log('4. 修改 user_id 字段为可空...');
    await connection.query('ALTER TABLE cart MODIFY COLUMN user_id INT NULL DEFAULT NULL');
    console.log('   ✅ user_id 字段已改为可空\n');

    // 5. 验证修改结果
    console.log('5. 验证修改结果...');
    const [updatedColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'cart'
      AND COLUMN_NAME = 'user_id'
    `, [process.env.DB_NAME || 'clothing_shop']);

    console.log('修改后的 user_id 字段信息:');
    console.log(updatedColumns[0]);
    console.log('');

    if (updatedColumns[0].IS_NULLABLE === 'YES') {
      console.log('✅ 修复成功！user_id 字段现在允许 NULL\n');
    } else {
      console.log('❌ 修复失败！user_id 字段仍然不允许 NULL\n');
    }

  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    await connection.end();
  }
}

fixCartUserField();
