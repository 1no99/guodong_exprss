const db = require('../config/database');

class ProductSpecModel {
  /**
   * 获取所有规格类型
   */
  static async getAll() {
    const sql = `
      SELECT *
      FROM specs
      ORDER BY sort_order ASC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  /**
   * 根据ID获取规格详情
   */
  static async findById(id) {
    const sql = 'SELECT * FROM specs WHERE id = ?';
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  }

  /**
   * 创建规格类型
   */
  static async create(specData) {
    const { spec_name, sort_order = 0, level = 1, parent_id = null } = specData;
    const sql = `
      INSERT INTO specs (spec_name, sort_order, level, parent_id)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [spec_name, sort_order, level, parent_id]);
    return result.insertId;
  }

  /**
   * 更新规格类型
   */
  static async update(id, specData) {
    const { spec_name, sort_order, level, parent_id } = specData;
    const updates = [];
    const values = [];

    if (spec_name !== undefined) {
      updates.push('spec_name = ?');
      values.push(spec_name);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }
    if (level !== undefined) {
      updates.push('level = ?');
      values.push(level);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(parent_id);
    }

    if (updates.length === 0) return;

    values.push(id);
    const sql = `
      UPDATE specs
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    await db.query(sql, values);
  }

  /**
   * 删除规格类型
   */
  static async delete(id) {
    const sql = 'DELETE FROM specs WHERE id = ?';
    await db.query(sql, [id]);
  }
}

module.exports = ProductSpecModel;
