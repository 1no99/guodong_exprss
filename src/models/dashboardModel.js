const db = require('../config/database');

class DashboardModel {
  /**
   * 获取统计数据
   */
  static async getStatistics(startTime, endTime) {
    // 总订单数
    const totalOrdersSql = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
       AND order_status = 2
    `;
    const [totalOrdersResult] = await db.query(totalOrdersSql, [startTime, endTime]);

    // 总用户数
    const totalUsersSql = `
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= ? AND created_at <= ?
    `;
    const [totalUsersResult] = await db.query(totalUsersSql, [startTime, endTime]);

    // 商品数量
    const productsSql = `
      SELECT COUNT(*) as count
      FROM products
      WHERE status = 1
    `;
    const [productsResult] = await db.query(productsSql);

    // 总销售额（已付款的订单）
    const totalSalesSql = `
      SELECT COALESCE(SUM(pay_amount), 0) as total
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
        AND order_status = 2
    `;
    const [totalSalesResult] = await db.query(totalSalesSql, [startTime, endTime]);

    return {
      total_orders: totalOrdersResult[0].count,
      total_users: totalUsersResult[0].count,
      total_products: productsResult[0].count,
      total_sales: parseFloat(totalSalesResult[0].total) || 0
    };
  }

  /**
   * 获取待处理订单列表（待付款订单）
   */
  static async getPendingOrders(startTime, endTime, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    // 构建WHERE条件
    let whereConditions = ['o.order_status = 0'];
    let queryParams = [];

    if (startTime && endTime) {
      whereConditions.push('o.created_at >= ? AND o.created_at <= ?');
      queryParams.push(startTime, endTime);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表
    const listSql = `
      SELECT
        o.id,
        o.order_no,
        o.user_id,
        o.total_amount,
        o.created_at,
        u.username,
        u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [orders] = await db.query(listSql, [...queryParams, pageSize, offset]);

    // 获取每个订单的商品信息（前3个）
    for (const order of orders) {
      const itemsSql = `
        SELECT product_id, product_name, product_image, price, quantity
        FROM order_items
        WHERE order_id = ?
        LIMIT 3
      `;
      const [items] = await db.query(itemsSql, [order.id]);
      order.items = items;

      // 检查是否有更多商品
      const countSql = 'SELECT COUNT(*) as count FROM order_items WHERE order_id = ?';
      const [countResult] = await db.query(countSql, [order.id]);
      order.total_items = countResult[0].count;
    }

    return {
      list: orders,
      pagination: {
        total,
        page,
        pageSize
      }
    };
  }
}

module.exports = DashboardModel;
