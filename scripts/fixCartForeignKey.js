require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixCartTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('开始修复 cart 表...\n');

    // 1. 检查是否已有 user_phone 字段
    console.log('1. 检查 user_phone 字段是否存在...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'cart'
      AND COLUMN_NAME = 'user_phone'
    `, [process.env.DB_NAME || 'clothing_shop']);

    const hasUserPhone = columns.length > 0;

    if (!hasUserPhone) {
      console.log('   ℹ️  user_phone 字段不存在，准备添加...\n');

      // 2. 删除唯一约束（需要先删除）
      console.log('2. 删除旧的唯一约束...');
      try {
        await connection.query('ALTER TABLE cart DROP INDEX uk_user_product');
        console.log('   ✅ 唯一约束已删除\n');
      } catch (err) {
        console.log('   ℹ️  唯一约束可能不存在，跳过\n');
      }

      // 3. 删除外键约束
      console.log('3. 删除 user_id 外键约束...');
      try {
        await connection.query('ALTER TABLE cart DROP FOREIGN KEY cart_ibfk_1');
        console.log('   ✅ user_id 外键约束已删除\n');
      } catch (err) {
        console.log('   ℹ️  user_id 外键约束可能不存在，跳过\n');
      }

      // 4. 删除 user_id 索引
      console.log('4. 删除 user_id 索引...');
      try {
        await connection.query('ALTER TABLE cart DROP INDEX idx_user_id');
        console.log('   ✅ user_id 索引已删除\n');
      } catch (err) {
        console.log('   ℹ️  user_id 索引可能不存在，跳过\n');
      }

      // 5. 将 user_id 改为可空
      console.log('5. 将 user_id 改为可空...');
      await connection.query('ALTER TABLE cart MODIFY COLUMN user_id INT NULL');
      console.log('   ✅ user_id 现在允许 NULL\n');

      // 6. 设置默认值为 NULL
      console.log('6. 设置 user_id 默认值为 NULL...');
      await connection.query('ALTER TABLE cart ALTER COLUMN user_id SET DEFAULT NULL');
      console.log('   ✅ user_id 默认值已设置为 NULL\n');

      // 7. 添加 user_phone 字段
      console.log('7. 添加 user_phone 字段...');
      await connection.query('ALTER TABLE cart ADD COLUMN user_phone VARCHAR(20) NULL AFTER user_id');
      console.log('   ✅ user_phone 字段已添加\n');

      // 8. 添加 user_phone 索引
      console.log('8. 添加 user_phone 索引...');
      await connection.query('ALTER TABLE cart ADD INDEX idx_user_phone (user_phone)');
      console.log('   ✅ user_phone 索引已添加\n');

      // 9. 添加新的唯一约束（使用 user_phone）
      console.log('9. 添加新的唯一约束（user_phone + product_id + sku_id）...');
      await connection.query('ALTER TABLE cart ADD UNIQUE KEY uk_user_phone_product (user_phone, product_id, sku_id)');
      console.log('   ✅ 唯一约束已添加\n');

    } else {
      console.log('   ℹ️  user_phone 字段已存在，跳过添加\n');
    }

    console.log('✅ cart 表修复完成！');
    console.log('\n现在可以正常使用购物车功能了');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await connection.end();
  }
}

fixCartTable();
