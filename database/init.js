const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mysql = require('mysql2/promise');

async function initDatabase() {
  try {
    console.log('正在连接数据库...');

    // 先连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '106.54.55.38',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'guodong',
      password: process.env.DB_PASSWORD || 'wasd1314990.',
      multipleStatements: true
    });

    console.log('数据库连接成功1');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('正在执行数据库初始化脚本...');

    // 执行SQL脚本
    await connection.query(sql);

    console.log('数据库初始化完成！');
    console.log('数据表创建成功，已插入测试数据');

    await connection.end();
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 执行初始化
initDatabase();
