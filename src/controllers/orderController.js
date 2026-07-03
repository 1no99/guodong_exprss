const OrderModel = require('../models/orderModel');
const ProductModel = require('../models/productModel');
const GoodTypeModel = require('../models/goodTypeModel');
const CartModel = require('../models/cartModel');
const AddressModel = require('../models/addressModel');
const UserModel = require('../models/userModel');
const Response = require('../utils/response');

class OrderController {
  /**
   * 创建订单
   */
  static async createOrder(req, res) {
    console.log('📦 [创建订单] 请求数据:', req.body);
    
    try {
      const { address_id, items, remark, phone,userNum } = req.body;

      // 验证参数
      if (!address_id) {
        return Response.validateError(res, '请选择收货地址');
      }

      if (!items || items.length === 0) {
        return Response.validateError(res, '请选择商品');
      }

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      // 获取收货地址
      const address = await AddressModel.findById(address_id);
      if (!address) {
        return Response.notFound(res, '收货地址不存在');
      }

      // 验证地址是否属于当前用户（通过手机号验证）
      if (address.user_phone !== phone) {
        return Response.forbidden(res, '无权使用该收货地址');
      }

      let totalAmount = 0;
      const orderItems = [];

      // 验证商品并计算金额
      for (const item of items) {
        if (!item.act_num_id) {
          return Response.validateError(res, '缺少规格ID');
        }

        const goodType = await GoodTypeModel.findById(item.act_num_id);
        if (!goodType) {
          return Response.validateError(res, `规格ID:${item.act_num_id} 不存在`);
        }

        if (goodType.stock < item.quantity) {
          return Response.error(res, `商品"${goodType.parentName} ${goodType.childName}"库存不足`, 400, 6002);
        }

        const product = await ProductModel.findById(item.product_id);

        const totalPrice = item.price * item.quantity;
        totalAmount += totalPrice;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_image: goodType.typeimg || product.main_image,
          sku_id: item.act_num_id,
          sku_name: item.spec || null,
          price: item.price,
          quantity: item.quantity,
          total_price: totalPrice
        });
      }

      // 生成订单编号
      const orderNo = OrderModel.generateOrderNo();

      // 构建订单数据
      const orderData = {
        order_no: orderNo,
        user_id: userNum, // 不使用user_id
        user_phone: phone, // 使用前端传递的手机号
        total_amount: totalAmount,
        pay_amount: totalAmount,
        pay_type: null, // 支付时设置
        receiver_name: address.receiver_name,
        receiver_phone: address.receiver_phone,
        receiver_address: `${address.province}${address.city}${address.district}${address.detail_address}`,
        remark
      };

      console.log('📦 [创建订单] 订单数据:', orderData);

      // 创建订单
      const orderId = await OrderModel.create(orderData, orderItems);

      // 清除购物车中已购买的商品（如果是来自购物车）
      const cartItemIds = items.filter(i => i.cart_id).map(i => i.cart_id);
      if (cartItemIds.length > 0) {
        await CartModel.batchRemove(cartItemIds, phone);
      }

      const order = await OrderModel.getDetailWithItems(orderId);

      return Response.success(res, order, '下单成功', 201);
    } catch (error) {
      console.error('创建订单错误:', error);
      return Response.serverError(res, '下单失败');
    }
  }

  /**
   * 获取订单列表
   */
  static async getOrderList(req, res) {
    try {
      const { phone, order_status, page, pageSize } = req.query;

      // 验证手机号参数
      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const params = {
        order_status,
        page,
        pageSize
      };

      console.log('📦 [订单列表] 查询参数 - phone:', phone, 'params:', params);

      const result = await OrderModel.getListByUserPhone(phone, params);

      return Response.success(res, result);
    } catch (error) {
      console.error('获取订单列表错误:', error);
      return Response.serverError(res, '获取订单列表失败');
    }
  }

  /**
   * 获取订单详情
   */
  static async getOrderDetail(req, res) {
    try {
      // 支持路径参数和查询参数两种方式
      const orderId = req.params.id || req.query.id;

      if (!orderId) {
        return Response.validateError(res, '订单ID不能为空');
      }

      const order = await OrderModel.getDetailWithItems(orderId);

      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      // 验证是否是当前用户的订单
      // if (order.user_id !== req.user.id) {
      //   return Response.forbidden(res, '无权访问该订单');
      // }

      return Response.success(res, order);
    } catch (error) {
      console.error('获取订单详情错误:', error);
      return Response.serverError(res, '获取订单详情失败');
    }
  }

  /**
   * 获取订单状态数量
   */
  static async getOrderStatusCount(req, res) {
    try {
      const { phone } = req.query;

      // 验证手机号参数
      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      console.log('📊 [订单统计] 查询参数 - phone:', phone);

      const counts = await OrderModel.getStatusCountByPhone(phone);

      return Response.success(res, counts);
    } catch (error) {
      console.error('获取订单状态数量错误:', error);
      return Response.serverError(res, '获取失败');
    }
  }

  // ==================== 管理员接口 ====================

  /**
   * 获取所有订单列表（管理员）
   */
  static async getAllOrders(req, res) {
    try {
      const { order_status, pay_status, keyword, page, pageSize } = req.query;

      const params = {
        order_status,
        pay_status,
        keyword,
        page,
        pageSize
      };

      const result = await OrderModel.getAllList(params);

      return Response.success(res, result);
    } catch (error) {
      console.error('获取所有订单错误:', error);
      return Response.serverError(res, '获取所有订单失败');
    }
  }

  /**
   * 获取订单详情（管理员）
   */
  static async getOrderByAdmin(req, res) {
    try {
      const { id } = req.params;

      const order = await OrderModel.getDetailWithItems(id);

      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      return Response.success(res, order);
    } catch (error) {
      console.error('获取订单详情错误:', error);
      return Response.serverError(res, '获取订单详情失败');
    }
  }

  /**
   * 更新订单（管理员）
   */
  static async updateOrderByAdmin(req, res) {
    try {
      const { id } = req.params;
      const { receiver_name, receiver_phone, receiver_address, remark } = req.body;

      const order = await OrderModel.findById(id);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      const updateData = {};
      if (receiver_name !== undefined) updateData.receiver_name = receiver_name;
      if (receiver_phone !== undefined) updateData.receiver_phone = receiver_phone;
      if (receiver_address !== undefined) updateData.receiver_address = receiver_address;
      if (remark !== undefined) updateData.remark = remark;

      await OrderModel.updateOrder(id, updateData);
      const updatedOrder = await OrderModel.getDetailWithItems(id);

      return Response.success(res, updatedOrder, '更新成功');
    } catch (error) {
      console.error('更新订单错误:', error);
      return Response.serverError(res, '更新订单失败');
    }
  }

  /**
   * 发货
   */
  static async shipOrder(req, res) {
    try {
      const { id } = req.params;
      const { express_company, express_no } = req.body;

      if (!express_company || !express_no) {
        return Response.validateError(res, '快递公司和快递单号不能为空');
      }

      const order = await OrderModel.findById(id);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      // 检查订单状态
      if (order.order_status !== 1) {
        return Response.error(res, '该订单无法发货', 400, 6006);
      }

      await OrderModel.ship(id, express_company, express_no);
      const updatedOrder = await OrderModel.getDetailWithItems(id);

      return Response.success(res, updatedOrder, '发货成功');
    } catch (error) {
      console.error('发货错误:', error);
      return Response.serverError(res, '发货失败');
    }
  }

  /**
   * 确认付款（管理员）
   */
  static async confirmPayment(req, res) {
    try {
      const { id } = req.params;

      const order = await OrderModel.findById(id);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      // 检查订单状态，只有待付款状态才能确认付款
      if (order.order_status !== 0) {
        return Response.error(res, '该订单无法确认付款', 400, 6007);
      }

      // 更新订单状态为已付款待发货
      await OrderModel.updateOrderStatus(id, 1);
      await OrderModel.updatePayStatusById(id, 1);

      const updatedOrder = await OrderModel.getDetailWithItems(id);

      return Response.success(res, updatedOrder, '确认付款成功');
    } catch (error) {
      console.error('确认付款错误:', error);
      return Response.serverError(res, '确认付款失败');
    }
  }

  /**
   * 管理员创建订单
   */
  static async createOrderByAdmin(req, res) {
    try {
      const {
        username,
        receiver_name,
        receiver_phone,
        receiver_address,
        total_amount,
        items,
        remark
      } = req.body;

      // 验证参数
      if (!username) {
        return Response.validateError(res, '请输入用户名');
      }

      // 根据用户名查找用户
      const user = await UserModel.findByUsername(username);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      if (!receiver_name || !receiver_phone || !receiver_address) {
        return Response.validateError(res, '请填写完整的收货信息');
      }

      if (!total_amount || total_amount <= 0) {
        return Response.validateError(res, '请输入正确的订单金额');
      }

      if (!items || items.length === 0) {
        return Response.validateError(res, '请选择商品');
      }

      const orderItems = [];

      // 验证商品
      for (const item of items) {
        const product = await ProductModel.findById(item.product_id);

        if (!product) {
          return Response.notFound(res, `商品ID:${item.product_id} 不存在`);
        }

        if (product.status !== 1) {
          return Response.error(res, `商品"${product.name}"已下架`, 400, 6001);
        }

        // 如果指定了规格，通过规格校验库存
        if (item.sku_id) {
          const goodType = await GoodTypeModel.findById(item.sku_id);
          if (!goodType) {
            return Response.validateError(res, `规格ID:${item.sku_id} 不存在`);
          }
          if (goodType.stock < item.quantity) {
            return Response.error(res, `商品"${goodType.parentName} ${goodType.childName}"库存不足`, 400, 6002);
          }
        } else {
          if (product.stock < item.quantity) {
            return Response.error(res, `商品"${product.name}"库存不足`, 400, 6002);
          }
        }

        const totalPrice = item.price * item.quantity;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_image: product.main_image,
          sku_id: item.sku_id || null,
          sku_name: item.sku_name || null,
          price: product.price,
          quantity: item.quantity,
          total_price: totalPrice
        });
      }

      // 生成订单编号
      const orderNo = OrderModel.generateOrderNo();

      // 构建订单数据
      const orderData = {
        order_no: orderNo,
        user_id: user.id,
        total_amount: total_amount,
        pay_amount: total_amount,
        pay_type: 'admin', // 管理员创建
        pay_status: 1, // 直接标记为已支付
        order_status: 1, // 直接标记为待发货
        receiver_name,
        receiver_phone,
        receiver_address,
        remark
      };

      // 创建订单
      const orderId = await OrderModel.create(orderData, orderItems);

      const order = await OrderModel.getDetailWithItems(orderId);

      return Response.success(res, order, '创建订单成功', 201);
    } catch (error) {
      console.error('管理员创建订单错误:', error);
      return Response.serverError(res, '创建订单失败');
    }
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id, order_status } = req.body;

      // 验证参数
      if (!id) {
        return Response.validateError(res, '订单ID不能为空');
      }

      if (order_status === undefined || order_status === null) {
        return Response.validateError(res, '订单状态不能为空');
      }

      // 验证状态值是否有效
      const validStatuses = [0, 1, 2, 3, 4]; // 待付款、待发货、已发货、已完成、已取消
      if (!validStatuses.includes(parseInt(order_status))) {
        return Response.validateError(res, '无效的订单状态值');
      }

      // 检查订单是否存在
      const order = await OrderModel.findById(id);
      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      // 更新订单状态
      await OrderModel.updateOrderStatus(id, order_status);

      // 获取更新后的订单
      const updatedOrder = await OrderModel.getDetailWithItems(id);

      return Response.success(res, updatedOrder, '订单状态更新成功');
    } catch (error) {
      console.error('更新订单状态错误:', error);
      return Response.serverError(res, '更新订单状态失败');
    }
  }

  /**
   * 公开获取订单详情（无需登录）
   */
  static async getPublicOrderDetail(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return Response.validateError(res, '订单ID不能为空');
      }

      const order = await OrderModel.getPublicDetailWithItems(id);

      if (!order) {
        return Response.notFound(res, '订单不存在');
      }

      return Response.success(res, order);
    } catch (error) {
      console.error('公开获取订单详情错误:', error);
      return Response.serverError(res, '获取订单详情失败');
    }
  }

}

module.exports = OrderController;
