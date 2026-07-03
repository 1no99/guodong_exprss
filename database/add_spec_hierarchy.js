require('dotenv').config();
const mysql = require('mysql2/promise');

async function addSpecHierarchy() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('添加规格层级结构支持');
    console.log('========================================\n');

    // 检查是否已经有这些字段
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'specs'
      AND COLUMN_NAME IN ('level', 'parent_id')
    `, [process.env.DB_NAME || 'clothing_shop']);

    const hasLevel = columns.some(col => col.COLUMN_NAME === 'level');
    const hasParentId = columns.some(col => col.COLUMN_NAME === 'parent_id');

    if (hasLevel && hasParentId) {
      console.log('✓ specs 表已经有 level 和 parent_id 字段，无需修改');
      return;
    }

    // 添加字段
    console.log('正在添加字段...');

    if (!hasLevel) {
      await connection.query(`
        ALTER TABLE specs
        ADD COLUMN level INT DEFAULT 1 COMMENT '规格级别：1-一级规格，2-二级规格'
      `);
      console.log('✓ 添加 level 字段');
    }

    if (!hasParentId) {
      await connection.query(`
        ALTER TABLE specs
        ADD COLUMN parent_id INT DEFAULT NULL COMMENT '父级规格ID（二级规格使用）'
      `);
      console.log('✓ 添加 parent_id 字段');

      // 添加外键约束
      await connection.query(`
        ALTER TABLE specs
        ADD CONSTRAINT fk_spec_parent
        FOREIGN KEY (parent_id) REFERENCES specs(id)
        ON DELETE CASCADE
      `);
      console.log('✓ 添加外键约束');
    }

    // 更新现有数据为一级规格
    await connection.query(`
      UPDATE specs SET level = 1 WHERE level IS NULL
    `);
    console.log('✓ 将现有数据设置为一级规格');

    // 添加索引
    await connection.query(`
      CREATE INDEX idx_parent_id ON specs(parent_id)
    `);
    console.log('✓ 添加索引');

    console.log('\n========================================');
    console.log('规格层级结构支持添加完成！');
    console.log('========================================\n');

    // 显示更新后的表结构
    const [tableColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'specs'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'clothing_shop']);

    console.log('更新后的 specs 表结构：');
    tableColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_COMMENT || ''}`);
    });

  } catch (error) {
    console.error('\n错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addSpecHierarchy();
