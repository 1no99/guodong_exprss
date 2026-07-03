const db = require('../config/database');
const Pagination = require('../utils/pagination');

class FavoriteModel {
  /**
   * 检查是否已收藏
   */
  static async checkFavorite(userId, productId) {
    const sql = 'SELECT * FROM favorites WHERE user_id = ? AND product_id = ?';
    const [favorites] = await db.query(sql, [userId, productId]);
    return favorites.length > 0;
  }

  /**
   * 添加收藏
   */
  static async add(userId, productId) {
    const sql = 'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)';
    await db.query(sql, [userId, productId]);
  }

  /**
   * 取消收藏
   */
  static async remove(userId, productId) {
    const sql = 'DELETE FROM favorites WHERE user_id = ? AND product_id = ?';
    await db.query(sql, [userId, productId]);
  }

  /**
   * 获取用户收藏列表
   */
  static async getList(userId, page = 1, pageSize = 10) {
    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    // 获取总数
    const countSql = 'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?';
    const [countResult] = await db.query(countSql, [userId]);
    const total = countResult[0].total;

    // 获取列表（包含商品信息）
    const listSql = `
      SELECT
        f.id as favorite_id,
        f.created_at as favorite_time,
        p.id,
        p.category_id,
        p.name,
        p.subtitle,
        p.main_image,
        p.price,
        p.original_price,
        p.sales,
        p.stock
      FROM favorites f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [favorites] = await db.query(listSql, [userId, currentPageSize, offset]);

    return Pagination.format(favorites, total, currentPage, currentPageSize);
  }
}

module.exports = FavoriteModel;
