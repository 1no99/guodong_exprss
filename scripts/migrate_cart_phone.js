const db = require('../src/config/database');

async function runMigration() {
  try {
    console.log('开始执行购物车表迁移...');

    // 检查 user_phone 列是否已存在
    const [columns] = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'gdexpress'
      AND TABLE_NAME = 'cart'
      AND COLUMN_NAME = 'user_phone'
    `);

    if (columns.length === 0) {
      console.log('添加 user_phone 字段...');
      await db.query('ALTER TABLE cart ADD COLUMN user_phone VARCHAR(20) DEFAULT NULL COMMENT "用户手机号"');
      console.log('添加索引...');
      await db.query('ALTER TABLE cart ADD INDEX idx_user_phone (user_phone)');
    } else {
      console.log('user_phone 字段已存在，跳过添加');
    }

    // 为现有的 cart 数据填充 user_phone（如果有关联的 user）
    console.log('更新现有数据的 user_phone...');
    const updateResult = await db.query(`
      UPDATE cart c
      LEFT JOIN users u ON c.user_id = u.id
      SET c.user_phone = u.phone
      WHERE c.user_phone IS NULL AND u.phone IS NOT NULL
    `);

    console.log('更新了', updateResult[0].affectedRows, '条记录');
    console.log('购物车表迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error.message);

    // 如果是列已存在的错误，可以忽略
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('字段已存在，跳过迁移');
      process.exit(0);
    }

    process.exit(1);
  }
}

runMigration();
