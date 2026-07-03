require('dotenv').config();
const UserModel = require('../src/models/userModel');

async function testUserNumGeneration() {
  try {
    console.log('测试用户编号生成功能...\n');

    // 测试生成唯一的用户编号
    console.log('1. 生成用户编号...');
    const userNum1 = await UserModel.generateUniqueUserNum();
    console.log(`   ✅ 生成的用户编号: ${userNum1}`);
    console.log(`   长度: ${userNum1.length} 位`);

    // 测试批量生成（确保唯一性）
    console.log('\n2. 批量生成10个用户编号（测试唯一性）...');
    const userNums = [];
    for (let i = 0; i < 10; i++) {
      const num = await UserModel.generateUniqueUserNum();
      userNums.push(num);
      console.log(`   ${i + 1}. ${num}`);
    }

    // 检查是否有重复
    const uniqueNums = new Set(userNums);
    if (uniqueNums.size === userNums.length) {
      console.log('\n   ✅ 所有编号都是唯一的');
    } else {
      console.log('\n   ❌ 存在重复的编号！');
    }

    // 查询数据库中的用户编号示例
    console.log('\n3. 查询数据库中的用户编号示例...');
    const db = require('../src/config/database');
    const [users] = await db.query('SELECT id, username, user_num FROM users WHERE user_num IS NOT NULL LIMIT 5');

    if (users.length > 0) {
      console.log('   找到已有用户编号的用户:');
      users.forEach(user => {
        console.log(`   - ID: ${user.id}, 用户名: ${user.username}, 用户编号: ${user.user_num}`);
      });
    } else {
      console.log('   ℹ️  数据库中还没有用户编号（需要新注册用户才会生成）');
    }

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    process.exit(0);
  }
}

testUserNumGeneration();
