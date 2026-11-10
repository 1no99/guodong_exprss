const db = require('../src/config/database');

/**
 * superadmin 表增加 type 字段
 * type: 1-代客下单用户，2-受限地区白名单用户
 * 存量数据默认归为 1（代客下单用户）
 */
async function addSuperAdminTypeField() {
  try {
    console.log('开始添加 superadmin.type 字段...');

    const [columns] = await db.query('SHOW COLUMNS FROM superadmin LIKE "type"');
    if (columns.length > 0) {
      console.log('✓ type 字段已存在，跳过添加');
    } else {
      await db.query(
        "ALTER TABLE superadmin ADD COLUMN type TINYINT NOT NULL DEFAULT 1 COMMENT '1-代客下单用户 2-受限地区白名单' AFTER pone"
      );
      console.log('✓ type 字段添加成功');
    }

    const [result] = await db.query('UPDATE superadmin SET type = 1 WHERE type IS NULL');
    console.log(`✓ 存量数据已补全 type=1（${result.affectedRows} 条）`);

    const [rows] = await db.query('SELECT * FROM superadmin LIMIT 5');
    console.log('当前数据示例:', rows);
    process.exit(0);
  } catch (error) {
    console.error('× 添加字段失败:', error.message);
    process.exit(1);
  }
}

addSuperAdminTypeField();
