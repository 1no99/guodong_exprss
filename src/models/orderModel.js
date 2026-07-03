const db = require('../config/database');
const Pagination = require('../utils/pagination');

class OrderModel {
  /**
   * 生成订单编号
   */
  static generateOrderNo() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${year}${month}${day}${hour}${minute}${second}${random}`;
  }

  /**
   * 创建订单
   */
  static async create(orderData, items) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 插入订单
      const orderSql = `
        INSERT INTO orders
        (order_no, user_id, user_phone, total_amount, pay_amount, pay_type, pay_status, order_status,
         receiver_name, receiver_phone, receiver_address, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const orderParams = [
        orderData.order_no,
        orderData.user_id,
        orderData.user_phone,
        orderData.total_amount,
        orderData.pay_amount,
        orderData.pay_type,
        0, // pay_status: 0未支付
        0, // order_status: 0待付款
        orderData.receiver_name,
        orderData.receiver_phone,
        orderData.receiver_address,
        orderData.remark || null
      ];

      const [orderResult] = await conn.query(orderSql, orderParams);
      const orderId = orderResult.insertId;

      // 插入订单商品
      for (const item of items) {
        const itemSql = `
          INSERT INTO order_items
          (order_id, product_id, product_name, product_image, sku_id, sku_name, price, quantity, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await conn.query(itemSql, [
          orderId,
          item.product_id,
          item.product_name,
          item.product_image,
          item.sku_id || null,
          item.sku_name || null,
          item.price,
          item.quantity,
          item.total_price
        ]);

        // 扣减规格库存
        if (item.sku_id) {
          await conn.query(
            'UPDATE goodtype SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.sku_id]
          );
        }
      }

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * 根据ID获取订单
   */
  static async findById(id) {
    const sql = 'SELECT * FROM orders WHERE id = ?';
    const [orders] = await db.query(sql, [id]);
    return orders[0];
  }

  /**
   * 根据订单编号获取订单
   */
  static async findByOrderNo(orderNo) {
    const sql = 'SELECT * FROM orders WHERE order_no = ?';
    const [orders] = await db.query(sql, [orderNo]);
    return orders[0];
  }

  /**
   * 获取订单详情（包含订单商品）
   */
  static async getDetailWithItems(orderId) {
    const sql = `
      SELECT o.*, u.username, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const [orders] = await db.query(sql, [orderId]);

    if (orders.length === 0) return null;

    const order = orders[0];

    // 获取订单商品
    const itemsSql = 'SELECT * FROM order_items WHERE order_id = ?';
    const [items] = await db.query(itemsSql, [orderId]);

    order.items = items;

    return order;
  }

  /**
   * 获取订单详情（包含订单商品，关联goodtype型号信息）
   */
  static async getPublicDetailWithItems(orderId) {
    const sql = `
      SELECT o.*, u.username, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const [orders] = await db.query(sql, [orderId]);

    if (orders.length === 0) return null;

    const order = orders[0];

    // 获取订单商品，关联goodtype表获取型号信息
    const itemsSql = `
      SELECT oi.*,
        gt.parentName AS spec_parent_name,
        gt.childName AS spec_child_name,
        gt.stock AS spec_stock,
        gt.typeimg AS spec_type_image,
        gt.price AS spec_price
      FROM order_items oi
      LEFT JOIN goodtype gt ON oi.sku_id = gt.id
      WHERE oi.order_id = ?
    `;
    const [items] = await db.query(itemsSql, [orderId]);

    order.items = items;

    return order;
  }

  /**
   * 获取用户订单列表
   */
  static async getListByUserId(userId, params = {}) {
    const {
      order_status,
      page = 1,
      pageSize = 10
    } = params;

    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    let whereConditions = ['user_id = ?'];
    let queryParams = [userId];

    if (order_status !== undefined && order_status !== '' && order_status !== -1) {
      whereConditions.push('order_status = ?');
      queryParams.push(order_status);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表
    const listSql = `
      SELECT
        id, order_no, user_phone, total_amount, pay_amount, pay_type, pay_status, order_status,
        receiver_name, receiver_phone, receiver_address, created_at, pay_time
      FROM orders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [orders] = await db.query(listSql, [...queryParams, currentPageSize, offset]);

    // 订单状态映射
    const orderStatusMap = {
      0: '待付款',
      1: '待确认',
      2: '待发货',
      3: '已完成',
    };

    // 获取每个订单的商品信息（前3个）
    for (const order of orders) {
      const itemsSql = `
        SELECT
          id,
          product_id as spuId,
          product_name as goodsName,
          product_image as goodsPictureUrl,
          price as actualPrice,
          quantity as buyQuantity
        FROM order_items
        WHERE order_id = ?
        LIMIT 3
      `;
      const [items] = await db.query(itemsSql, [order.id]);

      // 转换商品格式
      order.items = items.map(item => ({
        ...item,
        tagPrice: item.actualPrice,
        tagText: '',
        specifications: []
      }));

      // 检查是否有更多商品
      const countResult = await db.query('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [order.id]);
      order.total_items = countResult[0][0].count;

      // 添加前端需要的字段
      order.orderId = order.id;
      order.orderNo = order.order_no;
      order.orderStatus = order.order_status;
      order.orderStatusName = orderStatusMap[order.order_status] || '未知';
      order.paymentAmount = order.pay_amount;
      order.totalAmount = order.total_amount;
      order.createTime = order.created_at;
      order.orderItemVOs = order.items;
      delete order.id;
      delete order.order_no;
      delete order.order_status;
      delete order.pay_amount;
      delete order.created_at;
      delete order.items;

      // 物流信息
      order.logisticsVO = { logisticsNo: '' };

      // 运费（暂时设为0）
      order.freightFee = 0;

      // 按钮列表（根据订单状态返回）
      order.buttonVOs = this.getButtonsByStatus(order.orderStatus);
    }

    // 返回前端期望的格式
    return {
      orders: orders,
      total: total,
      page: currentPage,
      pageSize: currentPageSize
    };
  }

  /**
   * 根据手机号获取用户订单列表
   */
  static async getListByUserPhone(userPhone, params = {}) {
    const {
      order_status,
      page = 1,
      pageSize = 10
    } = params;

    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    let whereConditions = ['user_phone = ?'];
    let queryParams = [userPhone];

    if (order_status !== undefined && order_status !== '' && order_status !== -1) {
      whereConditions.push('order_status = ?');
      queryParams.push(order_status);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表
    const listSql = `
      SELECT * FROM orders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [orders] = await db.query(listSql, [...queryParams, currentPageSize, offset]);

    // 订单状态映射
    const orderStatusMap = {
       0: '待付款',
      1: '已确认',
      2: '已发货',
      4: '已取消',
    };

    // 获取每个订单的商品信息（前3个）
    for (const order of orders) {
      const itemsSql = `
        SELECT
          id,
          product_id as spuId,
          product_name as goodsName,
          product_image as goodsPictureUrl,
          price as actualPrice,
          quantity as buyQuantity,
          sku_name
        FROM order_items
        WHERE order_id = ?
        LIMIT 3
      `;
      const [items] = await db.query(itemsSql, [order.id]);

      // 转换商品格式
      order.items = items.map(item => ({
        ...item,
        tagPrice: item.actualPrice,
        tagText: '',
        specifications: []
      }));

      // 检查是否有更多商品
      const countResult = await db.query('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [order.id]);
      order.total_items = countResult[0][0].count;

      // 添加前端需要的字段
      order.orderId = order.id;
      order.orderNo = order.order_no;
      order.orderStatus = order.order_status;
      order.orderStatusName = orderStatusMap[order.order_status] || '未知';
      order.paymentAmount = order.pay_amount;
      order.totalAmount = order.total_amount;
      order.createTime = order.created_at;
      order.orderItemVOs = order.items;
      delete order.id;
      delete order.order_no;
      delete order.order_status;
      delete order.pay_amount;
      delete order.created_at;
      delete order.items;

      // 物流信息
      order.logisticsVO = { logisticsNo: '' };

      // 运费（暂时设为0）
      order.freightFee = 0;

      // 按钮列表（根据订单状态返回）
      order.buttonVOs = this.getButtonsByStatus(order.orderStatus);
    }

    // 返回前端期望的格式
    return {
      orders: orders,
      total: total,
      page: currentPage,
      pageSize: currentPageSize
    };
  }

  /**
   * 根据订单状态获取可用按钮
   */
  static getButtonsByStatus(status) {
    const buttons = [];

    switch (status) {
      case 1: // 待付款
        buttons.push({ text: '取消订单', type: 'cancel' });
        buttons.push({ text: '去支付', type: 'pay' });
        break;
      case 2: // 待确认
        buttons.push({ text: '联系客服', type: 'contact' });
        break;
      case 3: // 待发货
        buttons.push({ text: '提醒发货', type: 'remind' });
        break;
      case 4: // 已完成
        buttons.push({ text: '再次购买', type: 'rebuy' });
        break;
    }

    return buttons;
  }

  /**
   * 更新订单状态
   */
  static async updateStatus(orderId, status, userId = null) {
    let sql = 'UPDATE orders SET order_status = ?';
    const params = [status];

    if (userId) {
      sql += ' WHERE id = ? AND user_id = ?';
      params.push(orderId, userId);
    } else {
      sql += ' WHERE id = ?';
      params.push(orderId);
    }

    await db.query(sql, params);
  }

  /**
   * 更新订单状态（管理员用）
   */
  static async updateOrderStatus(orderId, status) {
    const sql = 'UPDATE orders SET order_status = ? WHERE id = ?';
    await db.query(sql, [status, orderId]);
  }

  /**
   * 更新支付状态（管理员用）
   */
  static async updatePayStatusById(orderId, status) {
    const sql = 'UPDATE orders SET pay_status = ? WHERE id = ?';
    await db.query(sql, [status, orderId]);
  }

  /**
   * 更新支付状态
   */
  static async updatePayStatus(orderNo, payType) {
    const sql = `
      UPDATE orders
      SET pay_status = 1, pay_type = ?, pay_time = NOW(), order_status = 1
      WHERE order_no = ?
    `;
    await db.query(sql, [payType, orderNo]);
  }

  /**
   * 订单统计
   */
  static async getStatusCount(userId) {
    const sql = `
      SELECT
        COUNT(CASE WHEN order_status = 1 THEN 1 END) as pending_payment,
        COUNT(CASE WHEN order_status = 2 THEN 1 END) as pending_confirm,
        COUNT(CASE WHEN order_status = 3 THEN 1 END) as pending_delivery,
        COUNT(CASE WHEN order_status = 4 THEN 1 END) as complete
      FROM orders
      WHERE user_id = ?
    `;

    const [result] = await db.query(sql, [userId]);
    const counts = result[0];

    // 返回前端期望的格式
    return [
      { tabType: 1, orderNum: counts.pending_payment || 0 },     // 待付款
      { tabType: 2, orderNum: counts.pending_confirm || 0 },     // 待确认
      { tabType: 3, orderNum: counts.pending_delivery || 0 },    // 待发货
      { tabType: 4, orderNum: counts.complete || 0 },           // 已完成
    ];
  }

  /**
   * 根据手机号统计订单数量
   */
  static async getStatusCountByPhone(userPhone) {
    const sql = `
      SELECT
        COUNT(CASE WHEN order_status = 1 THEN 1 END) as pending_payment,
        COUNT(CASE WHEN order_status = 2 THEN 1 END) as pending_confirm,
        COUNT(CASE WHEN order_status = 3 THEN 1 END) as pending_delivery,
        COUNT(CASE WHEN order_status = 4 THEN 1 END) as complete
      FROM orders
      WHERE user_phone = ?
    `;

    const [result] = await db.query(sql, [userPhone]);
    const counts = result[0];

    // 返回前端期望的格式
    return [
      { tabType: 1, orderNum: counts.pending_payment || 0 },     // 待付款
      { tabType: 2, orderNum: counts.pending_confirm || 0 },     // 待确认
      { tabType: 3, orderNum: counts.pending_delivery || 0 },    // 待发货
      { tabType: 4, orderNum: counts.complete || 0 },           // 已完成
    ];
  }

  /**
   * 获取所有订单列表（管理员用）
   */
  static async getAllList(params = {}) {
    const {
      order_status,
      pay_status,
      keyword,
      page = 1,
      pageSize = 10
    } = params;

    const { page: currentPage, pageSize: currentPageSize, offset } = Pagination.getParams(page, pageSize);

    let whereConditions = ['1=1'];
    let queryParams = [];

    if (order_status !== undefined && order_status !== '') {
      whereConditions.push('order_status = ?');
      queryParams.push(order_status);
    }

    if (pay_status !== undefined && pay_status !== '') {
      whereConditions.push('pay_status = ?');
      queryParams.push(pay_status);
    }

    if (keyword) {
      whereConditions.push('(order_no LIKE ? OR receiver_name LIKE ? OR receiver_phone LIKE ?)');
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern, keywordPattern);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const total = countResult[0].total;

    // 获取列表（关联用户表查询用户信息）
    const listSql = `
      SELECT o.*,
        u.username AS user_username,
        u.nickname AS user_nickname,
        u.avatar AS user_avatar,
        u.phone AS user_account_phone
      FROM orders o
      LEFT JOIN users u ON o.user_phone = u.phone
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [orders] = await db.query(listSql, [...queryParams, currentPageSize, offset]);

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

      // 添加用户信息
      order.userInfo = {
        username: order.user_username || '',
        nickname: order.user_nickname || '',
        avatar: order.user_avatar || '',
        phone: order.user_account_phone || order.user_phone || ''
      };
      delete order.user_username;
      delete order.user_nickname;
      delete order.user_avatar;
      delete order.user_account_phone;
    }

    return Pagination.format(orders, total, currentPage, currentPageSize);
  }

  /**
   * 更新订单（管理员用）
   */
  static async updateOrder(id, updateData) {
    const fields = [];
    const values = [];

    const allowedFields = ['receiver_name', 'receiver_phone', 'receiver_address', 'remark'];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return true;
  }

  /**
   * 发货
   */
  static async ship(id, expressCompany, expressNo) {
    const sql = `
      UPDATE orders
      SET order_status = 2, express_company = ?, express_no = ?, express_time = NOW()
      WHERE id = ?
    `;
    await db.query(sql, [expressCompany, expressNo, id]);
  }
}

module.exports = OrderModel;
