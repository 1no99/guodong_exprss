require('dotenv').config();
const mysql = require('mysql2/promise');

// 创建数据库连接池
const pool = mysql.createPool({
  host:'guodongyichu.fun',
  port:3306,
  user:'guodong',
  password:'wasd1314990.',
  database:'guodong',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    console.log('数据库连接成功2');
    connection.release();
  })
  .catch(err => {
    console.error('数据库连接失败:', err.message);
  });

module.exports = pool;
