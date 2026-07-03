const BannerModel = require('../models/bannerModel');
const Response = require('../utils/response');

class BannerController {
  /**
   * 获取轮播图列表（前台用，只返回启用的）
   */
  static async getBannerList(req, res) {
    try {
      const banners = await BannerModel.getList();
      return Response.success(res, banners);
    } catch (error) {
      console.error('获取轮播图列表错误:', error);
      return Response.serverError(res, '获取轮播图列表失败');
    }
  }

  /**
   * 获取所有轮播图（后台管理用，包括禁用的）
   */
  static async getAllBanners(req, res) {
    try {
      const banners = await BannerModel.getAllList();
      return Response.success(res, banners);
    } catch (error) {
      console.error('获取所有轮播图错误:', error);
      return Response.serverError(res, '获取所有轮播图失败');
    }
  }

  /**
   * 获取轮播图详情
   */
  static async getBannerDetail(req, res) {
    try {
      const { id } = req.params;
      const banner = await BannerModel.findById(id);

      if (!banner) {
        return Response.notFound(res, '轮播图不存在');
      }

      return Response.success(res, banner);
    } catch (error) {
      console.error('获取轮播图详情错误:', error);
      return Response.serverError(res, '获取轮播图详情失败');
    }
  }

  /**
   * 创建轮播图
   */
  static async createBanner(req, res) {
    try {
      const { title, image, sort_order, status } = req.body;

      // 验证必填字段
      if (!image) {
        return Response.validateError(res, '图片不能为空');
      }

      const bannerData = {
        title,
        image,
        sort_order,
        status
      };

      const bannerId = await BannerModel.create(bannerData);
      const banner = await BannerModel.findById(bannerId);

      return Response.success(res, banner, '创建成功', 201);
    } catch (error) {
      console.error('创建轮播图错误:', error);
      return Response.serverError(res, '创建轮播图失败');
    }
  }

  /**
   * 更新轮播图
   */
  static async updateBanner(req, res) {
    try {
      const { id } = req.params;
      const { title, image, sort_order, status } = req.body;

      const banner = await BannerModel.findById(id);
      if (!banner) {
        return Response.notFound(res, '轮播图不存在');
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (image !== undefined) updateData.image = image;
      if (sort_order !== undefined) updateData.sort_order = sort_order;
      if (status !== undefined) updateData.status = status;

      await BannerModel.update(id, updateData);
      const updatedBanner = await BannerModel.findById(id);

      return Response.success(res, updatedBanner, '更新成功');
    } catch (error) {
      console.error('更新轮播图错误:', error);
      return Response.serverError(res, '更新轮播图失败');
    }
  }

  /**
   * 删除轮播图
   */
  static async deleteBanner(req, res) {
    try {
      const { id } = req.params;

      const banner = await BannerModel.findById(id);
      if (!banner) {
        return Response.notFound(res, '轮播图不存在');
      }

      await BannerModel.delete(id);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除轮播图错误:', error);
      return Response.serverError(res, '删除轮播图失败');
    }
  }

  /**
   * 更新轮播图状态
   */
  static async updateBannerStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status === undefined || status < 0 || status > 1) {
        return Response.validateError(res, '状态值不正确');
      }

      const banner = await BannerModel.findById(id);
      if (!banner) {
        return Response.notFound(res, '轮播图不存在');
      }

      await BannerModel.updateStatus(id, status);
      const updatedBanner = await BannerModel.findById(id);

      return Response.success(res, updatedBanner, '更新成功');
    } catch (error) {
      console.error('更新轮播图状态错误:', error);
      return Response.serverError(res, '更新状态失败');
    }
  }
}

module.exports = BannerController;
