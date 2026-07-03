const CategoryModel = require('../models/categoryModel');
const Response = require('../utils/response');

class CategoryController {
  /**
   * 获取分类列表
   */
  static async getCategoryList(req, res) {
    try {
      const categories = await CategoryModel.getList(1);
      return Response.success(res, categories);
    } catch (error) {
      console.error('获取分类列表错误:', error);
      return Response.serverError(res, '获取分类列表失败');
    }
  }

  /**
   * 获取分类树
   */
  static async getCategoryTree(req, res) {
    try {
      const tree = await CategoryModel.getTree(1);
      return Response.success(res, tree);
    } catch (error) {
      console.error('获取分类树错误:', error);
      return Response.serverError(res, '获取分类树失败');
    }
  }

  /**
   * 获取分类详情
   */
  static async getCategoryDetail(req, res) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findById(id);

      if (!category) {
        return Response.notFound(res, '分类不存在');
      }

      return Response.success(res, category);
    } catch (error) {
      console.error('获取分类详情错误:', error);
      return Response.serverError(res, '获取分类详情失败');
    }
  }

  /**
   * 获取所有分类（包括禁用的，后台管理用）
   */
  static async getAllCategories(req, res) {
    try {
      const { name } = req.query;
      let categories;

      if (name) {
        // 如果有名称搜索，在前端过滤
        const allCategories = await CategoryModel.getList(null);
        categories = allCategories.filter(cat =>
          cat.name.toLowerCase().includes(name.toLowerCase())
        );
      } else {
        categories = await CategoryModel.getList(null);
      }

      return Response.success(res, categories);
    } catch (error) {
      console.error('获取所有分类错误:', error);
      return Response.serverError(res, '获取所有分类失败');
    }
  }

  /**
   * 创建分类
   */
  static async createCategory(req, res) {
    try {
      const { parent_id, name, icon, sort_order, status } = req.body;

      // 验证必填字段
      if (!name) {
        return Response.validateError(res, '分类名称不能为空');
      }

      const categoryData = {
        parent_id,
        name,
        icon,
        sort_order,
        status
      };

      const categoryId = await CategoryModel.create(categoryData);
      const category = await CategoryModel.findById(categoryId);

      return Response.success(res, category, '创建成功', 201);
    } catch (error) {
      console.error('创建分类错误:', error);
      return Response.serverError(res, '创建分类失败');
    }
  }

  /**
   * 更新分类
   */
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { parent_id, name, icon, sort_order, status } = req.body;

      const category = await CategoryModel.findById(id);
      if (!category) {
        return Response.notFound(res, '分类不存在');
      }

      // 防止将分类设置为自己的子分类
      if (parent_id === parseInt(id)) {
        return Response.error(res, '不能将分类设置为自己的子分类', 400, 4001);
      }

      const updateData = {};
      if (parent_id !== undefined) updateData.parent_id = parent_id;
      if (name !== undefined) updateData.name = name;
      if (icon !== undefined) updateData.icon = icon;
      if (sort_order !== undefined) updateData.sort_order = sort_order;
      if (status !== undefined) updateData.status = status;

      await CategoryModel.update(id, updateData);
      const updatedCategory = await CategoryModel.findById(id);

      return Response.success(res, updatedCategory, '更新成功');
    } catch (error) {
      console.error('更新分类错误:', error);
      return Response.serverError(res, '更新分类失败');
    }
  }

  /**
   * 删除分类
   */
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await CategoryModel.findById(id);
      if (!category) {
        return Response.notFound(res, '分类不存在');
      }

      // 检查是否有子分类
      const db = require('../config/database');
      const [children] = await db.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);

      if (children[0].count > 0) {
        return Response.error(res, '该分类下有子分类，无法删除', 400, 4002);
      }

      // 检查是否有商品
      const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);

      if (products[0].count > 0) {
        return Response.error(res, '该分类下有商品，无法删除', 400, 4003);
      }

      await CategoryModel.delete(id);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除分类错误:', error);
      return Response.serverError(res, '删除分类失败');
    }
  }
}

module.exports = CategoryController;
