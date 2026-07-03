const ProductSpecModel = require('../models/productSpecModel');
const Response = require('../utils/response');
const { body, validationResult } = require('express-validator');

class ProductSpecController {
  /**
   * 验证规则
   */
  static validateCreate = [
    body('spec_name').notEmpty().withMessage('规格名称不能为空').isLength({ max: 50 }).withMessage('规格名称最大50个字符')
  ];

  /**
   * 获取所有规格类型列表
   */
  static async getAll(req, res) {
    try {
      const specs = await ProductSpecModel.getAll();
      return Response.success(res, specs, '获取规格列表成功');
    } catch (error) {
      console.error('获取规格列表错误:', error);
      return Response.serverError(res, '获取规格列表失败');
    }
  }

  /**
   * 创建规格类型
   */
  static async create(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.error(res, errors.array()[0].msg, 400, 1001);
      }

      const { spec_name, sort_order = 0, level = 1, parent_id } = req.body;

      // 验证层级关系
      if (level === 2 && !parent_id) {
        return Response.error(res, '二级规格必须指定父级规格ID', 400, 1002);
      }

      // 创建规格
      const specId = await ProductSpecModel.create({
        spec_name,
        sort_order,
        level,
        parent_id
      });

      // 获取创建的规格详情
      const spec = await ProductSpecModel.findById(specId);

      return Response.success(res, spec, '创建规格成功', 201);
    } catch (error) {
      console.error('创建规格错误:', error);
      return Response.serverError(res, '创建规格失败');
    }
  }

  /**
   * 更新规格类型
   */
  static async update(req, res) {
    try {
      const { id } = req.params;

      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.error(res, errors.array()[0].msg, 400, 1001);
      }

      const { spec_name, sort_order, level, parent_id } = req.body;

      // 检查规格是否存在
      const spec = await ProductSpecModel.findById(id);
      if (!spec) {
        return Response.notFound(res, '规格不存在');
      }

      // 验证层级关系
      if (level === 2 && !parent_id) {
        return Response.error(res, '二级规格必须指定父级规格ID', 400, 1002);
      }

      // 更新规格
      await ProductSpecModel.update(id, { spec_name, sort_order, level, parent_id });

      // 获取更新后的规格详情
      const updatedSpec = await ProductSpecModel.findById(id);

      return Response.success(res, updatedSpec, '更新规格成功');
    } catch (error) {
      console.error('更新规格错误:', error);
      return Response.serverError(res, '更新规格失败');
    }
  }

  /**
   * 删除规格类型
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // 检查规格是否存在
      const spec = await ProductSpecModel.findById(id);
      if (!spec) {
        return Response.notFound(res, '规格不存在');
      }

      // 删除规格
      await ProductSpecModel.delete(id);

      return Response.success(res, null, '删除规格成功');
    } catch (error) {
      console.error('删除规格错误:', error);
      return Response.serverError(res, '删除规格失败');
    }
  }
}

module.exports = ProductSpecController;
