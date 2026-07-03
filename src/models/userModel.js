const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  /**
   * 根据ID查找用户
   */
  static async findById(id) {
    const sql = 'SELECT id, openid, username, phone, avatar, nickname, gender, birthday, points, balance, status, user_num, created_at FROM users WHERE id = ?';
    const [users] = await db.query(sql, [id]);
    return users[0];
  }

  /**
   * 根据openid查找用户
   */
  static async findByOpenid(openid) {
    const sql = 'SELECT id, openid, username, phone, avatar, nickname, gender, birthday, points, balance, status, user_num, created_at FROM users WHERE openid = ?';
    const [users] = await db.query(sql, [openid]);
    return users[0];
  }

  /**
   * 根据手机号查找用户
   */
  static async findByPhone(phone) {
    const sql = 'SELECT * FROM users WHERE phone = ?';
    const [users] = await db.query(sql, [phone]);
    return users[0];
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const [users] = await db.query(sql, [username]);
    console.log(db.query(sql, [username]));
    return users[0];
  }

  /**
   * 从手机号获取用户编号（后5位）
   */
  static getUserNumFromPhone(phone) {
    if (!phone || typeof phone !== 'string') return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 5 ? digits.slice(-5) : digits;
  }

  /**
   * 创建用户（微信授权）
   */
  static async createByWechat(openid, userInfo = {}) {
    const sql = `
      INSERT INTO users (openid, username, nickname, avatar, gender, last_login_time)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const params = [
      openid,
      userInfo.nickname || '微信用户',
      userInfo.nickname || '',
      userInfo.avatar || '/default-avatar.png',
      userInfo.gender || 0
    ];
    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  /**
   * 生成唯一的7位用户编号
   */
  static async generateUniqueUserNum() {
    let userNum;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // 生成7位随机数字（1000000-9999999）
      userNum = Math.floor(1000000 + Math.random() * 9000000).toString();

      // 检查是否已存在
      const [existing] = await db.query('SELECT id FROM users WHERE user_num = ?', [userNum]);

      if (existing.length === 0) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error('无法生成唯一的用户编号，请重试');
    }

    return userNum;
  }

  /**
   * 创建用户（手机号注册）
   */
  static async createByPhone(phone, password, username) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNum = this.getUserNumFromPhone(phone);

    const sql = `
      INSERT INTO users (phone, password, username, user_num, last_login_time)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await db.query(sql, [phone, hashedPassword, username, userNum]);
    return result.insertId;
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id, data) {
    const fields = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 更新最后登录时间
   */
  static async updateLastLoginTime(id) {
    const sql = 'UPDATE users SET last_login_time = NOW() WHERE id = ?';
    await db.query(sql, [id]);
  }

  /**
   * 更新用户手机号
   */
  static async updatePhone(id, phone) {
    const userNum = this.getUserNumFromPhone(phone);
    const sql = 'UPDATE users SET phone = ?, user_num = ? WHERE id = ?';
    await db.query(sql, [phone, userNum, id]);
  }

  /**
   * 创建用户（管理员）
   */
  static async createByAdmin(username, password, phone, status = '1', remark = '') {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNum = this.getUserNumFromPhone(phone);

    const sql = `
      INSERT INTO users (username, password, phone, user_num, status, remark)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [username, hashedPassword, phone, userNum, status, remark]);
    return result.insertId;
  }

  /**
   * 删除用户
   */
  static async deleteUser(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    await db.query(sql, [id]);
  }


}

module.exports = UserModel;
