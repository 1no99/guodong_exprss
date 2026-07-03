require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAddressForeignKey() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop',
    multipleStatements: true
  });

  try {
    console.log('开始修复 addresses 表的外键约束...\n');

    // 1. 删除外键约束
    console.log('1. 删除外键约束...');
    await connection.query('ALTER TABLE addresses DROP FOREIGN KEY addresses_ibfk_1');
    console.log('   ✅ 外键约束已删除\n');

    // 2. 删除 user_id 索引
    console.log('2. 删除 user_id 索引...');
    await connection.query('ALTER TABLE addresses DROP INDEX idx_user_id');
    console.log('   ✅ user_id 索引已删除\n');

    // 3. 将 user_id 改为可空
    console.log('3. 将 user_id 改为可空...');
    await connection.query('ALTER TABLE addresses MODIFY COLUMN user_id INT NULL');
    console.log('   ✅ user_id 现在允许 NULL\n');

    // 4. 为新记录设置默认值为 NULL
    console.log('4. 设置默认值为 NULL...');
    await connection.query('ALTER TABLE addresses ALTER COLUMN user_id SET DEFAULT NULL');
    console.log('   ✅ 默认值已设置为 NULL\n');

    // 5. 为 user_phone 添加索引（如果没有的话）
    console.log('5. 为 user_phone 添加索引...');
    try {
      await connection.query('ALTER TABLE addresses ADD INDEX idx_user_phone (user_phone)');
      console.log('   ✅ user_phone 索引已添加\n');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  user_phone 索引已存在，跳过\n');
      } else {
        throw err;
      }
    }

    console.log('✅ 修复完成！');
    console.log('\n现在可以正常创建地址了，user_id 可以为 NULL');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('\n提示: 外键约束或索引可能已经删除过了，可以忽略此错误');
    }
  } finally {
    await connection.end();
  }
}

fixAddressForeignKey();
