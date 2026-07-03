const FavoriteModel = require('../models/favoriteModel');
const Response = require('../utils/response');

class FavoriteController {
  /**
   * 获取收藏列表
   */
  static async getFavoriteList(req, res) {
    try {
      const { page, pageSize } = req.query;
      const result = await FavoriteModel.getList(req.user.id, page, pageSize);
      return Response.success(res, result);
    } catch (error) {
      console.error('获取收藏列表错误:', error);
      return Response.serverError(res, '获取收藏列表失败');
    }
  }

  /**
   * 添加收藏
   */
  static async addFavorite(req, res) {
    try {
      const { product_id } = req.body;

      if (!product_id) {
        return Response.validateError(res, '商品ID不能为空');
      }

      // 检查是否已收藏
      const isFavorited = await FavoriteModel.checkFavorite(req.user.id, product_id);
      if (isFavorited) {
        return Response.error(res, '该商品已收藏', 400, 4001);
      }

      await FavoriteModel.add(req.user.id, product_id);

      return Response.success(res, null, '收藏成功', 201);
    } catch (error) {
      console.error('添加收藏错误:', error);
      return Response.serverError(res, '收藏失败');
    }
  }

  /**
   * 取消收藏
   */
  static async removeFavorite(req, res) {
    try {
      const { product_id } = req.params;

      if (!product_id) {
        return Response.validateError(res, '商品ID不能为空');
      }

      await FavoriteModel.remove(req.user.id, product_id);

      return Response.success(res, null, '取消收藏成功');
    } catch (error) {
      console.error('取消收藏错误:', error);
      return Response.serverError(res, '取消收藏失败');
    }
  }

  /**
   * 检查是否已收藏
   */
  static async checkFavorite(req, res) {
    try {
      const { product_id } = req.params;

      if (!product_id) {
        return Response.validateError(res, '商品ID不能为空');
      }

      const isFavorited = await FavoriteModel.checkFavorite(req.user.id, product_id);

      return Response.success(res, { is_favorited: isFavorited });
    } catch (error) {
      console.error('检查收藏状态错误:', error);
      return Response.serverError(res, '检查失败');
    }
  }
}

module.exports = FavoriteController;
