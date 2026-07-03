const db = require('../src/config/database');

async function checkFields() {
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM addresses');
    console.log('addresses 表的所有字段:');
    cols.forEach((col, i) => console.log(`${i+1}. ${col.Field}`));
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

checkFields();
