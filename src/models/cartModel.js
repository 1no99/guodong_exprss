const db = require('../config/database');

class CartModel {
  /**
   * 获取用户购物车列表（包含商品信息）
   */
  static async getList(userId) {
    const sql = `
      SELECT
        c.id as cart_id,
        c.quantity,
        c.sku_id,
        c.created_at as add_time,
        p.id as product_id,
        p.name,
        p.subtitle,
        p.main_image,
        p.price,
        p.original_price,
        p.stock,
        p.status
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;

    const [cartItems] = await db.query(sql, [userId]);

    // 解析SKU信息并计算小计
    return cartItems.map(item => {
      const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2);
      return {
        ...item,
        subtotal: parseFloat(subtotal),
        is_valid: item.status === 1 && item.stock > 0
      };
    });
  }

  /**
   * 添加商品到购物车
   */
  static async add(userId, productId, skuId, quantity = 1) {
    // 检查商品是否已在购物车
    const checkSql = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND ? <=> sku_id';
    const [existing] = await db.query(checkSql, [userId, productId, skuId || null]);

    if (existing.length > 0) {
      // 更新数量
      const updateSql = `
        UPDATE cart
        SET quantity = quantity + ?
        WHERE user_id = ? AND product_id = ? AND ? <=> sku_id
      `;
      await db.query(updateSql, [quantity, userId, productId, skuId || null]);
    } else {
      // 插入新记录
      const insertSql = `
        INSERT INTO cart (user_id, product_id, sku_id, quantity)
        VALUES (?, ?, ?, ?)
      `;
      await db.query(insertSql, [userId, productId, skuId, quantity]);
    }
  }

  /**
   * 更新购物车商品数量
   */
  static async updateQuantity(cartId, userId, quantity) {
    const sql = `
      UPDATE cart
      SET quantity = ?
      WHERE id = ? AND user_id = ?
    `;
    await db.query(sql, [quantity, cartId, userId]);
  }

  /**
   * 删除购物车商品
   */
  static async remove(cartId, userId) {
    const sql = 'DELETE FROM cart WHERE id = ? AND user_id = ?';
    await db.query(sql, [cartId, userId]);
  }

  /**
   * 清空购物车
   */
  static async clear(userId) {
    const sql = 'DELETE FROM cart WHERE user_id = ?';
    await db.query(sql, [userId]);
  }

  /**
   * 批量删除购物车商品
   */
  static async batchRemove(cartIds, userId) {
    const placeholders = cartIds.map(() => '?').join(',');
    const sql = `DELETE FROM cart WHERE id IN (${placeholders}) AND user_id = ?`;
    await db.query(sql, [...cartIds, userId]);
  }

  /**
   * 获取购物车商品数量
   */
  static async getCount(userId) {
    const sql = 'SELECT SUM(quantity) as total FROM cart WHERE user_id = ?';
    const [result] = await db.query(sql, [userId]);
    return result[0].total || 0;
  }

  /**
   * 根据手机号获取用户购物车列表（包含商品信息及goodtype规格）
   */
  static async getListByPhone(userPhone) {
    // 1. 查询购物车+商品信息
    const cartSql = `
      SELECT
        c.id as cart_id,
        c.quantity,
        c.sku_id,
        c.size_money,
        c.act_num_id,
        c.created_at as add_time,
        p.id as product_id,
        p.name,
        p.subtitle,
        p.main_image,
        p.price,
        p.original_price,
        p.stock,
        p.status
      FROM cart c
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.user_phone = ?
      ORDER BY c.created_at DESC
    `;

    const [cartItems] = await db.query(cartSql, [userPhone]);

    if (cartItems.length === 0) return [];

    // 2. 批量查询所有关联的goodtype
    const productIds = [...new Set(cartItems.map(item => item.product_id).filter(Boolean))];
    let goodTypeMap = {};

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const gtSql = `SELECT * FROM goodtype WHERE goodid IN (${placeholders})`;
      const [goodTypes] = await db.query(gtSql, productIds);

      // 按goodid分组
      goodTypes.forEach(gt => {
        if (!goodTypeMap[gt.goodid]) goodTypeMap[gt.goodid] = [];
        goodTypeMap[gt.goodid].push({
          id: gt.id,
          goodid: gt.goodid,
          price: gt.price,
          parentName: gt.parentName,
          childName: gt.childName,
          stock: gt.stock,
          typeimg: gt.typeimg,
          etx1: gt.etx1,
          etx2: gt.etx2,
          etx3: gt.etx3
        });
      });
    }

    // 3. 合并数据并计算小计
    return cartItems.map(item => {
      const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2);
      return {
        ...item,
        good_types: goodTypeMap[item.product_id] || [],
        subtotal: parseFloat(subtotal),
        is_valid: item.status === 1 && item.stock > 0
      };
    });
  }

  /**
   * 根据手机号添加商品到购物车
   */
  static async addByPhone(userPhone, productId, skuId, quantity = 1,sizeMoney,actNumId) {
    // 检查商品是否已在购物车
    const checkSql = 'SELECT * FROM cart WHERE user_phone = ? AND product_id = ? AND ? <=> sku_id';
    const [existing] = await db.query(checkSql, [userPhone, productId, skuId,sizeMoney || null,actNumId]);

    if (existing.length > 0) {
      // 更新数量
      const updateSql = `
        UPDATE cart
        SET quantity = quantity + ?
        WHERE user_phone = ? AND product_id = ? AND ? <=> sku_id
      `;
      await db.query(updateSql, [quantity, userPhone, productId, skuId,sizeMoney || null,actNumId]);
    } else {
      // 插入新记录
      const insertSql = `
        INSERT INTO cart (user_phone, product_id, sku_id, quantity,size_money,act_num_id)
        VALUES (?, ?, ?, ?,?,?)
      `;
      await db.query(insertSql, [userPhone, productId, skuId, quantity,sizeMoney,actNumId]);
    }
  }

  /**
   * 根据手机号更新购物车商品数量
   */
  static async updateQuantityByPhone(cartId, userPhone, quantity) {
    const sql = `
      UPDATE cart
      SET quantity = ?
      WHERE id = ? AND user_phone = ?
    `;
    await db.query(sql, [quantity, cartId, userPhone]);
  }

  /**
   * 根据手机号删除购物车商品
   */
  static async removeByPhone(cartId, userPhone) {
    const sql = 'DELETE FROM cart WHERE id = ? AND user_phone = ?';
    await db.query(sql, [cartId, userPhone]);
  }

  /**
   * 根据手机号清空购物车
   */
  static async clearByPhone(userPhone) {
    const sql = 'DELETE FROM cart WHERE user_phone = ?';
    await db.query(sql, [userPhone]);
  }

  /**
   * 根据手机号批量删除购物车商品
   */
  static async batchRemoveByPhone(cartIds, userPhone) {
    const placeholders = cartIds.map(() => '?').join(',');
    const sql = `DELETE FROM cart WHERE id IN (${placeholders}) AND user_phone = ?`;
    await db.query(sql, [...cartIds, userPhone]);
  }

  /**
   * 根据手机号获取购物车商品数量
   */
  static async getCountByPhone(userPhone) {
    const sql = 'SELECT SUM(quantity) as total FROM cart WHERE user_phone = ?';
    const [result] = await db.query(sql, [userPhone]);
    return result[0].total || 0;
  }
}

module.exports = CartModel;
