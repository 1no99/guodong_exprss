const db = require('../config/database');

class CategoryModel {
  /**
   * 获取分类列表
   */
  static async getList(status = null) {
    let sql = 'SELECT * FROM categories';
    let params = [];

    if (status !== null) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sort_order DESC, created_at ASC';

    const [categories] = await db.query(sql, params);
    return categories;
  }

  /**
   * 根据ID获取分类
   */
  static async findById(id) {
    const sql = 'SELECT * FROM categories WHERE id = ?';
    const [categories] = await db.query(sql, [id]);
    return categories[0];
  }

  /**
   * 获取分类树
   */
  static async getTree(status = null) {
    const categories = await this.getList(status);

    // 构建树形结构
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    const tree = [];
    categoryMap.forEach(category => {
      if (category.parent_id === 0) {
        tree.push(category);
      } else {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(category);
        }
      }
    });

    return tree;
  }

  /**
   * 创建分类
   */
  static async create(categoryData) {
    const sql = `
      INSERT INTO categories (parent_id, name, icon, sort_order, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      categoryData.parent_id || 0,
      categoryData.name,
      categoryData.icon || null,
      categoryData.sort_order || 0,
      categoryData.status !== undefined ? categoryData.status : 1
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  /**
   * 更新分类
   */
  static async update(id, categoryData) {
    const fields = [];
    const values = [];

    const updateFields = ['parent_id', 'name', 'icon', 'sort_order', 'status'];

    updateFields.forEach(field => {
      if (categoryData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(categoryData[field]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 删除分类
   */
  static async delete(id) {
    const sql = 'DELETE FROM categories WHERE id = ?';
    await db.query(sql, [id]);
  }
}

module.exports = CategoryModel;
