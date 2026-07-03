const db = require('../config/database');

class AddressModel {
  /**
   * 根据用户手机号获取地址列表
   */
  static async findByUserPhone(userPhone) {
    const sql = 'SELECT * FROM addresses WHERE user_phone = ? ORDER BY is_default DESC, created_at DESC';
    const [addresses] = await db.query(sql, [userPhone]);
    return addresses;
  }

  /**
   * 获取用户地址列表（保留原有方法以兼容）
   */
  static async findByUserId(userId) {
    const sql = 'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC';
    const [addresses] = await db.query(sql, [userId]);
    return addresses;
  }

  /**
   * 根据ID获取地址
   */
  static async findById(id) {
    const sql = 'SELECT * FROM addresses WHERE id = ?';
    const [addresses] = await db.query(sql, [id]);
    return addresses[0];
  }

  /**
   * 创建地址
   */
  static async create(addressData) {
    const {
      user_id,
      user_phone,
      receiver_name,
      receiver_phone,
      province,
      city,
      district,
      detail_address,
      postal_code,
      is_default
    } = addressData;

    const sql = `
      INSERT INTO addresses
      (user_id, user_phone, receiver_name, receiver_phone, province, city, district, detail_address, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      user_id,
      user_phone,
      receiver_name,
      receiver_phone,
      province,
      city,
      district,
      detail_address,
      postal_code,
      is_default || 0
    ]);

    return result.insertId;
  }

  /**
   * 更新地址
   */
  static async update(id, addressData) {
    const fields = [];
    const values = [];

    Object.keys(addressData).forEach(key => {
      if (addressData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(addressData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE addresses SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 删除地址
   */
  static async delete(id) {
    const sql = 'DELETE FROM addresses WHERE id = ?';
    await db.query(sql, [id]);
  }

  /**
   * 设置默认地址（根据手机号）
   */
  static async setDefault(userPhone, addressId) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 取消该手机号的所有默认地址
      await conn.query('UPDATE addresses SET is_default = 0 WHERE user_phone = ?', [userPhone]);

      // 设置新的默认地址
      await conn.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_phone = ?', [addressId, userPhone]);

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = AddressModel;
