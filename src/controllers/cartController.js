const CartModel = require('../models/cartModel');
const ProductModel = require('../models/productModel');
const Response = require('../utils/response');

class CartController {
  /**
   * 获取购物车列表
   */
  static async getCartList(req, res) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const cartList = await CartModel.getListByPhone(phone);

      // 计算总价和总数
      let totalAmount = 0;
      let totalQuantity = 0;
      let validItems = 0;

      cartList.forEach(item => {
        if (item.is_valid) {
          totalAmount += item.subtotal;
          totalQuantity += item.quantity;
          validItems++;
        }
      });

      return Response.success(res, {
        list: cartList,
        summary: {
          total_amount: parseFloat(totalAmount.toFixed(2)),
          total_quantity: totalQuantity,
          valid_items: validItems
        }
      });
    } catch (error) {
      console.error('获取购物车列表错误:', error);
      return Response.serverError(res, '获取购物车列表失败');
    }
  }

  /**
   * 添加商品到购物车
   */
  static async addToCart(req, res) {
    try {
      const { phone, product_id, sku_id, quantity ,sizeMoney,actNumId} = req.body;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      if (!product_id) {
        return Response.validateError(res, '商品ID不能为空');
      }

      const addQuantity = quantity || 1;

      // 检查商品是否存在
      const product = await ProductModel.findById(product_id);
      if (!product) {
        return Response.notFound(res, '商品不存在');
      }

     

      await CartModel.addByPhone(phone, product_id, sku_id, addQuantity,sizeMoney,actNumId);

      // 获取购物车数量
      const count = await CartModel.getCountByPhone(phone);

      return Response.success(res, { count }, '添加成功', 201);
    } catch (error) {
      console.error('添加到购物车错误:', error);
      return Response.serverError(res, '添加失败');
    }
  }

  /**
   * 更新购物车商品数量
   */
  static async updateCartItem(req, res) {
    try {
      const { id } = req.params;
      const { phone, quantity } = req.body;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      if (!quantity || quantity < 1) {
        return Response.validateError(res, '数量必须大于0');
      }

      // 获取购物车商品信息
      const db = require('../config/database');
      const [cartItems] = await db.query(
        'SELECT * FROM cart WHERE id = ? AND user_phone = ?',
        [id, phone]
      );

      if (cartItems.length === 0) {
        return Response.notFound(res, '购物车商品不存在');
      }

      const cartItem = cartItems[0];

      // 检查商品库存
      const product = await ProductModel.findById(cartItem.product_id);
      if (product.stock < quantity) {
        return Response.error(res, '库存不足', 400, 5002);
      }

      await CartModel.updateQuantityByPhone(id, phone, quantity);

      return Response.success(res, null, '更新成功');
    } catch (error) {
      console.error('更新购物车错误:', error);
      return Response.serverError(res, '更新失败');
    }
  }

  /**
   * 删除购物车商品
   */
  static async removeFromCart(req, res) {
    try {
      const { id } = req.params;
      const { phone } = req.body;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      await CartModel.removeByPhone(id, phone);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除购物车商品错误:', error);
      return Response.serverError(res, '删除失败');
    }
  }

  /**
   * 批量删除购物车商品
   */
  static async batchRemove(req, res) {
    try {
      const { ids, phone } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return Response.validateError(res, '请选择要删除的商品');
      }

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      await CartModel.batchRemoveByPhone(ids, phone);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('批量删除购物车商品错误:', error);
      return Response.serverError(res, '删除失败');
    }
  }

  /**
   * 清空购物车
   */
  static async clearCart(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      await CartModel.clearByPhone(phone);

      return Response.success(res, null, '清空成功');
    } catch (error) {
      console.error('清空购物车错误:', error);
      return Response.serverError(res, '清空失败');
    }
  }

  /**
   * 获取购物车数量
   */
  static async getCartCount(req, res) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const count = await CartModel.getCountByPhone(phone);

      return Response.success(res, { count });
    } catch (error) {
      console.error('获取购物车数量错误:', error);
      return Response.serverError(res, '获取失败');
    }
  }
}

module.exports = CartController;
