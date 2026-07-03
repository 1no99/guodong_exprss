const db = require('../config/database');
const Pagination = require('../utils/pagination');

class ProductModel {
  /**
   * 获取商品列表
   */
  static async getList(params = {}) {
    const {
      category_id,
      keyword,
      status = 1,
      is_hot,
      is_new,
      is_recommend,
      page = 1,
      pageSize = 10
    } = params;

    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    let whereConditions = ['status = ?'];
    let queryParams = [status];

    if (category_id) {
      whereConditions.push('category_id = ?');
      queryParams.push(category_id);
    }

    if (keyword) {
      whereConditions.push('(name LIKE ? OR subtitle LIKE ?)');
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern);
    }

    if (is_hot !== undefined) {
      whereConditions.push('is_hot = ?');
      queryParams.push(is_hot);
    }

    if (is_new !== undefined) {
      whereConditions.push('is_new = ?');
      queryParams.push(is_new);
    }

    if (is_recommend !== undefined) {
      whereConditions.push('is_recommend = ?');
      queryParams.push(is_recommend);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM products WHERE ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表
    const listSql = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY sort_order DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [products] = await db.query(listSql, [...queryParams, currentPageSize, offset]);

    return Pagination.format(products, total, currentPage, currentPageSize);
  }

  /**
   * 后台管理：获取所有商品（包括禁用的）
   */
  static async getAdminList(params = {}) {
    const {
      category_id,
      keyword,
      is_hot,
      is_new,
      is_recommend,
      status,
      page = 1,
      pageSize = 10
    } = params;

    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (category_id) {
      whereConditions.push('category_id = ?');
      queryParams.push(category_id);
    }

    if (keyword) {
      whereConditions.push('(name LIKE ? OR subtitle LIKE ?)');
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern);
    }

    if (status !== undefined) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (is_hot !== undefined) {
      whereConditions.push('is_hot = ?');
      queryParams.push(is_hot);
    }

    if (is_new !== undefined) {
      whereConditions.push('is_new = ?');
      queryParams.push(is_new);
    }

    if (is_recommend !== undefined) {
      whereConditions.push('is_recommend = ?');
      queryParams.push(is_recommend);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM products WHERE ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表
    const listSql = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [products] = await db.query(listSql, [...queryParams, currentPageSize, offset]);

    return Pagination.format(products, total, currentPage, currentPageSize);
  }

  /**
   * 根据ID获取商品详情
   */
  static async findById(id) {
    const sql = 'SELECT * FROM products WHERE id = ?';
    const [products] = await db.query(sql, [id]);
    return products[0];
  }

  /**
   * 获取商品详情（包含分类信息）
   */
  static async getDetailWithCategory(id) {
    const sql = `
      SELECT * FROM products p
      WHERE p.id = ?
    `;
    const [products] = await db.query(sql, [id]);
    console.log(products[0].name);
    
    return products[0];
  }

  /**
   * 创建商品
   */
  static async create(productData) {
    const sql = `
      INSERT INTO products
      (category_id, spec_ids, name, subtitle, main_image, images, images1, images2, images3, images4, images5, detail, price, original_price, cost_price, stock, sku_list, attributes, sort_order, status, is_hot, is_new, is_recommend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      productData.category_id,
      productData.spec_ids || null,
      productData.name,
      productData.subtitle || null,
      productData.main_image || null,
      productData.images ? JSON.stringify(productData.images) : null,
      productData.images1 || null,
      productData.images2 || null,
      productData.images3 || null,
      productData.images4 || null,
      productData.images5 || null,
      productData.detail || null,
      productData.price,
      productData.original_price || null,
      productData.cost_price || null,
      productData.stock || 0,
      productData.sku_list ? JSON.stringify(productData.sku_list) : null,
      productData.attributes ? JSON.stringify(productData.attributes) : null,
      productData.sort_order || 0,
      productData.status !== undefined ? productData.status : 1,
      productData.is_hot || 0,
      productData.is_new || 0,
      productData.is_recommend || 0
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  /**
   * 更新商品
   */
  static async update(id, productData) {
    const fields = [];
    const values = [];

    const updateFields = [
      'category_id', 'spec_ids', 'name', 'subtitle', 'main_image', 'images', 'images1', 'images2', 'images3', 'images4', 'images5', 'detail',
      'price', 'original_price', 'cost_price', 'stock', 'sku_list', 'attributes',
      'sort_order', 'status', 'is_hot', 'is_new', 'is_recommend'
    ];

    updateFields.forEach(field => {
      if (productData[field] !== undefined) {
        if (['images', 'sku_list', 'attributes'].includes(field) && productData[field]) {
          fields.push(`${field} = ?`);
          values.push(JSON.stringify(productData[field]));
        } else {
          fields.push(`${field} = ?`);
          values.push(productData[field]);
        }
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 删除商品
   */
  static async delete(id) {
    const sql = 'DELETE FROM products WHERE id = ?';
    await db.query(sql, [id]);
  }

  /**
   * 更新库存
   */
  static async updateStock(id, quantity) {
    const sql = 'UPDATE products SET stock = stock + ? WHERE id = ?';
    await db.query(sql, [quantity, id]);
  }

  /**
   * 更新销量
   */
  static async updateSales(id, quantity) {
    const sql = 'UPDATE products SET sales = sales + ? WHERE id = ?';
    await db.query(sql, [quantity, id]);
  }
}

module.exports = ProductModel;
