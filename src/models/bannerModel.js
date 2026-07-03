const db = require('../config/database');

class BannerModel {
  /**
   * 获取启用的轮播图列表
   */
  static async getList() {
    const sql = `
      SELECT * FROM banners
      WHERE status = 1
      AND (start_time IS NULL OR start_time <= NOW())
      AND (end_time IS NULL OR end_time >= NOW())
      ORDER BY sort_order DESC, created_at DESC
    `;

    const [banners] = await db.query(sql);
    return banners;
  }

  /**
   * 根据ID获取轮播图
   */
  static async findById(id) {
    const sql = 'SELECT * FROM banners WHERE id = ?';
    const [banners] = await db.query(sql, [id]);
    return banners[0];
  }

  /**
   * 获取所有轮播图列表（包括禁用的）
   */
  static async getAllList() {
    const sql = `
      SELECT * FROM banners
      ORDER BY sort_order DESC, created_at DESC
    `;
    const [banners] = await db.query(sql);
    return banners;
  }

  /**
   * 创建轮播图
   */
  static async create(bannerData) {
    const sql = `
      INSERT INTO banners (title, image, sort_order, status)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      bannerData.title || null,
      bannerData.image,
      bannerData.sort_order || 0,
      bannerData.status !== undefined ? bannerData.status : 1
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  /**
   * 更新轮播图
   */
  static async update(id, bannerData) {
    const fields = [];
    const values = [];

    const updateFields = ['title', 'image', 'sort_order', 'status'];

    updateFields.forEach(field => {
      if (bannerData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(bannerData[field]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE banners SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 删除轮播图
   */
  static async delete(id) {
    const sql = 'DELETE FROM banners WHERE id = ?';
    await db.query(sql, [id]);
  }

  /**
   * 更新状态
   */
  static async updateStatus(id, status) {
    const sql = 'UPDATE banners SET status = ? WHERE id = ?';
    await db.query(sql, [status, id]);
  }
}

module.exports = BannerModel;
