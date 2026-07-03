const ProductModel = require('../models/productModel');
const GoodTypeModel = require('../models/goodTypeModel');
const Response = require('../utils/response');

class ProductController {
  /**
   * 获取商品列表
   */
  static async getProductList(req, res) {
    try {
      const {
        category_id,
        keyword,
        is_hot,
        is_new,
        is_recommend,
        page,
        pageSize
      } = req.query;

      const params = {
        category_id,
        keyword,
        is_hot,
        is_new,
        is_recommend,
        page,
        pageSize
      };

      const result = await ProductModel.getList(params);
      return Response.success(res, result);
    } catch (error) {
      console.error('获取商品列表错误:', error);
      return Response.serverError(res, '获取商品列表失败');
    }
  }

  /**
   * 获取商品详情
   */
  static async getProductDetail(req, res) {
    try {
      const { id } = req.params;

      const product = await ProductModel.getDetailWithCategory(id);

      if (!product) {
        return Response.notFound(res, '商品不存在');
      }

      // 解析JSON字段
      if (product.images) {
        try {
          product.images = JSON.parse(product.images);
        } catch (e) {
          product.images = [];
        }
      }

      if (product.sku_list) {
        try {
          product.sku_list = JSON.parse(product.sku_list);
        } catch (e) {
          product.sku_list = [];
        }
      }

      if (product.attributes) {
        try {
          product.attributes = JSON.parse(product.attributes);
        } catch (e) {
          product.attributes = [];
        }
      }

      // 从 goodtype 表获取规格
      product.spec_ids = await GoodTypeModel.getByProductId(id);

      return Response.success(res, product);
    } catch (error) {
      console.error('获取商品详情错误:', error);
      return Response.serverError(res, '获取商品详情失败');
    }
  }

  /**
   * 搜索商品
   */
  static async searchProducts(req, res) {
    try {
      const { keyword, page, pageSize } = req.query;

      if (!keyword) {
        return Response.validateError(res, '请输入搜索关键词');
      }

      const params = { keyword, page, pageSize };
      const result = await ProductModel.getList(params);

      return Response.success(res, result);
    } catch (error) {
      console.error('搜索商品错误:', error);
      return Response.serverError(res, '搜索失败');
    }
  }

  // ==================== 后台管理接口 ====================

  /**
   * 获取所有商品（后台管理用）
   */
  static async getAllProducts(req, res) {
    try {
      const {
        category_id,
        keyword,
        is_hot,
        is_new,
        is_recommend,
        page,
        pageSize
      } = req.query;

      const params = {
        category_id,
        keyword,
        is_hot,
        is_new,
        is_recommend,
        page,
        pageSize
      };

      const result = await ProductModel.getAdminList(params);
      return Response.success(res, result);
    } catch (error) {
      console.error('获取所有商品错误:', error);
      return Response.serverError(res, '获取所有商品失败');
    }
  }

  /**
   * 创建商品
   */
  static async createProduct(req, res) {
    try {
      console.log('[创建商品] 入参:', req.body);

      const {
        category_id,
        spec_ids,
        name,
        subtitle,
        main_image,
        images1,
        images2,
        images3,
        images4,
        images5,
        images,
        detail,
        price,
        original_price,
        cost_price,
        stock,
        sku_list,
        attributes,
        is_hot = 0,
        is_new = 0,
        is_recommend = 0
      } = req.body;

      // 验证必填字段
      if (!name || !category_id || !main_image) {
        return Response.validateError(res, '商品名称、分类和图片不能为空');
      }

      // 处理独立的images1-5字段
      let processedImages = null;
      if (images) {
        processedImages = images;
      } else if (images1 || images2 || images3 || images4 || images5) {
        processedImages = [images1, images2, images3, images4, images5].filter(img => img);
      }

      const productData = {
        category_id: parseInt(category_id),
        spec_ids: Array.isArray(spec_ids) ? JSON.stringify(spec_ids) : (spec_ids || null),
        name,
        subtitle: subtitle || '',
        main_image,
        images: processedImages,
        images1: images1 || null,
        images2: images2 || null,
        images3: images3 || null,
        images4: images4 || null,
        images5: images5 || null,
        detail: detail || '',
        price: price || '0.00',
        original_price: original_price || price || '0.00',
        cost_price: cost_price || '0.00',
        stock: parseInt(stock) || 9999999,
        sku_list: sku_list || [],
        attributes: attributes || [],
        is_hot: parseInt(is_hot) || 0,
        is_new: parseInt(is_new) || 0,
        is_recommend: parseInt(is_recommend) || 0
      };

      console.log('[创建商品] 处理后的数据:', {
        ...productData,
        images1: productData.images1 ? '有数据' : '无',
        images2: productData.images2 ? '有数据' : '无',
        images3: productData.images3 ? '有数据' : '无',
        images4: productData.images4 ? '有数据' : '无',
        images5: productData.images5 ? '有数据' : '无'
      });

      const productId = await ProductModel.create(productData);

      // 将商品规格存入 goodtype 表
      let specs = [];
      if (spec_ids) {
        specs = typeof spec_ids === 'string' ? JSON.parse(spec_ids) : spec_ids;
      }
      if (specs.length > 0) {
        await GoodTypeModel.createBatch(productId, specs);
      }

      const product = await ProductModel.findById(productId);
      product.spec_ids = await GoodTypeModel.getByProductId(productId);

      return Response.success(res, product, '创建成功', 201);
    } catch (error) {
      console.error('创建商品错误:', error);
      return Response.serverError(res, `创建商品失败: ${error.message}`);
    }
  }

  /**
   * 更新商品
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const {
        category_id,
        spec_ids,
        name,
        subtitle,
        main_image,
        images1,
        images2,
        images3,
        images4,
        images5,
        images,
        detail,
        price,
        original_price,
        cost_price,
        stock,
        sku_list,
        attributes,
        is_hot,
        is_new,
        is_recommend
      } = req.body;

      const product = await ProductModel.findById(id);
      if (!product) {
        return Response.notFound(res, '商品不存在');
      }

      // 处理独立的images1-5字段
      let processedImages = undefined;
      if (images !== undefined) {
        processedImages = images;
      } else if (images1 !== undefined || images2 !== undefined || images3 !== undefined ||
                 images4 !== undefined || images5 !== undefined) {
        processedImages = [images1, images2, images3, images4, images5].filter(img => img);
      }

      const updateData = {};
      if (category_id !== undefined) updateData.category_id = parseInt(category_id);
      if (spec_ids !== undefined) updateData.spec_ids = Array.isArray(spec_ids) ? JSON.stringify(spec_ids) : spec_ids;
      if (name !== undefined) updateData.name = name;
      if (subtitle !== undefined) updateData.subtitle = subtitle;
      if (main_image !== undefined) updateData.main_image = main_image;
      if (processedImages !== undefined) updateData.images = processedImages;
      if (images1 !== undefined) updateData.images1 = images1;
      if (images2 !== undefined) updateData.images2 = images2;
      if (images3 !== undefined) updateData.images3 = images3;
      if (images4 !== undefined) updateData.images4 = images4;
      if (images5 !== undefined) updateData.images5 = images5;
      if (detail !== undefined) updateData.detail = detail;
      if (price !== undefined) updateData.price = price;
      if (original_price !== undefined) updateData.original_price = original_price;
      if (cost_price !== undefined) updateData.cost_price = cost_price;
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (sku_list !== undefined) updateData.sku_list = sku_list;
      if (attributes !== undefined) updateData.attributes = attributes;
      if (is_hot !== undefined) updateData.is_hot = parseInt(is_hot);
      if (is_new !== undefined) updateData.is_new = parseInt(is_new);
      if (is_recommend !== undefined) updateData.is_recommend = parseInt(is_recommend);

      console.log('[更新商品] 处理后的数据:', {
        ...updateData,
        images1: updateData.images1 ? '有数据' : '无',
        images2: updateData.images2 ? '有数据' : '无',
        images3: updateData.images3 ? '有数据' : '无',
        images4: updateData.images4 ? '有数据' : '无',
        images5: updateData.images5 ? '有数据' : '无'
      });

      await ProductModel.update(id, updateData);

      // 更新商品规格到 goodtype 表
      if (spec_ids !== undefined) {
        let specs = [];
        if (spec_ids) {
          specs = typeof spec_ids === 'string' ? JSON.parse(spec_ids) : spec_ids;
        }
        await GoodTypeModel.replaceSpecs(id, specs);
      }

      const updatedProduct = await ProductModel.findById(id);
      updatedProduct.spec_ids = await GoodTypeModel.getByProductId(id);

      return Response.success(res, updatedProduct, '更新成功');
    } catch (error) {
      console.error('更新商品错误:', error);
      return Response.serverError(res, '更新商品失败');
    }
  }

  /**
   * 删除商品
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await ProductModel.findById(id);
      if (!product) {
        return Response.notFound(res, '商品不存在');
      }

      await GoodTypeModel.deleteByProductId(id);
      await ProductModel.delete(id);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除商品错误:', error);
      return Response.serverError(res, '删除商品失败');
    }
  }

  /**
   * 更新商品状态
   */
  static async updateProductStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const product = await ProductModel.findById(id);
      if (!product) {
        return Response.notFound(res, '商品不存在');
      }

      await ProductModel.update(id, { status });

      return Response.success(res, null, '状态更新成功');
    } catch (error) {
      console.error('更新商品状态错误:', error);
      return Response.serverError(res, '更新商品状态失败');
    }
  }
}

module.exports = ProductController;
