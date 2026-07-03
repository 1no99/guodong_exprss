const AddressModel = require('../models/addressModel');
const Response = require('../utils/response');

class AddressController {
  /**
   * 获取地址列表（根据用户手机号查询）
   */
  static async getAddressList(req, res) {
    try {
      // 从查询参数获取手机号
      const { phone } = req.query;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const addresses = await AddressModel.findByUserPhone(phone);
      return Response.success(res, addresses);
    } catch (error) {
      console.error('获取地址列表错误:', error);
      return Response.serverError(res, '获取地址列表失败');
    }
  }

  /**
   * 获取地址详情
   */
  static async getAddressDetail(req, res) {
    try {
      const { id } = req.params;
      const address = await AddressModel.findById(id);

      if (!address) {
        return Response.notFound(res, '地址不存在');
      }

      return Response.success(res, address);
    } catch (error) {
      console.error('获取地址详情错误:', error);
      return Response.serverError(res, '获取地址详情失败');
    }
  }

  /**
   * 创建地址
   */
  static async createAddress(req, res) {
    try {
      const {
        phone,            // 用户手机号（user_phone）
        name,             // 收货人姓名（前端字段）
        receiver_name,    // 收货人姓名（兼容字段）
        province,
        city,
        district,
        detail_address,
        postal_code,
        is_default,
        user_phone        // 前端直接传的用户手机号
      } = req.body;

      // 兼容前端字段：如果前端传了 name，使用 name；否则使用 receiver_name
      const finalName = name || receiver_name;

      // 确定 user_phone：优先使用 user_phone，否则使用 phone
      const finalUserPhone = user_phone || phone;

      // 验证必填字段
      if (!finalUserPhone) {
        return Response.validateError(res, '用户手机号不能为空');
      }

      if (!finalName || !province || !city || !district || !detail_address) {
        return Response.validateError(res, '请填写完整的地址信息');
      }

      // 如果请求中有 phone 字段但不是 user_phone，则作为收货人电话
      // 如果没有专门的 phone，则使用用户手机号
      const receiverPhone = phone && phone !== finalUserPhone ? phone : finalUserPhone;

      const addressData = {
        user_id: null,
        user_phone: finalUserPhone,
        receiver_name: finalName,
        receiver_phone: receiverPhone,
        province,
        city,
        district,
        detail_address,
        postal_code,
        is_default
      };

      // 如果设置为默认地址，先取消该手机号的其他默认地址
      if (is_default) {
        const db = require('../config/database');
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_phone = ?', [finalUserPhone]);
      }

      const addressId = await AddressModel.create(addressData);
      const address = await AddressModel.findById(addressId);

      return Response.success(res, address, '添加成功', 201);
    } catch (error) {
      console.error('创建地址错误:', error);
      return Response.serverError(res, '添加地址失败');
    }
  }

  /**
   * 更新地址
   */
  static async updateAddress(req, res) {
    try {
      const { id } = req.params;
      const { phone, user_phone, name } = req.body;

      console.log('📍 [更新地址] 请求参数:', { id, body: req.body });

      // 优先使用 user_phone，否则使用 phone
      const finalUserPhone = user_phone || phone;

      if (!finalUserPhone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const address = await AddressModel.findById(id);

      if (!address) {
        return Response.notFound(res, '地址不存在');
      }

      console.log('📍 [更新地址] 当前地址:', address);
      console.log('📍 [更新地址] user_phone 对比:', { address: address.user_phone, request: finalUserPhone, addressType: typeof address.user_phone, requestType: typeof finalUserPhone });

      // 验证是否是当前用户的地址（通过手机号验证）
      // 将两者都转换为字符串进行比较，避免类型不匹配
      if (String(address.user_phone) !== String(finalUserPhone)) {
        return Response.forbidden(res, '无权修改该地址');
      }

      const updateData = {};
      const allowedFields = ['receiver_name', 'receiver_phone', 'province', 'city', 'district', 'detail_address', 'postal_code', 'is_default'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // 兼容前端字段：如果前端传了 name，映射到 receiver_name
      if (name !== undefined) {
        updateData.receiver_name = name;
      }

      // 如果设置了 phone 且与 user_phone 不同，更新 receiver_phone
      if (phone && phone !== finalUserPhone) {
        updateData.receiver_phone = phone;
      }

      console.log('📍 [更新地址] 准备更新的数据:', updateData);

      // 如果设置为默认地址，先取消该手机号的其他默认地址
      if (updateData.is_default) {
        const db = require('../config/database');
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_phone = ?', [finalUserPhone]);
      }

      await AddressModel.update(id, updateData);
      const updatedAddress = await AddressModel.findById(id);

      console.log('📍 [更新地址] 更新后的地址:', updatedAddress);

      return Response.success(res, updatedAddress, '更新成功');
    } catch (error) {
      console.error('更新地址错误:', error);
      return Response.serverError(res, '更新地址失败');
    }
  }

  /**
   * 删除地址
   */
  static async deleteAddress(req, res) {
    try {
      const { id } = req.params;

      const address = await AddressModel.findById(id);

      if (!address) {
        return Response.notFound(res, '地址不存在');
      }

      await AddressModel.delete(id);

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除地址错误:', error);
      return Response.serverError(res, '删除地址失败');
    }
  }

  /**
   * 设置默认地址
   */
  static async setDefaultAddress(req, res) {
    try {
      const { id } = req.params;
      const { phone, user_phone } = req.body;

      // 优先使用 user_phone，否则使用 phone
      const finalUserPhone = user_phone || phone;

      if (!finalUserPhone) {
        return Response.validateError(res, '手机号不能为空');
      }

      const address = await AddressModel.findById(id);

      if (!address) {
        return Response.notFound(res, '地址不存在');
      }

      // 验证是否是当前用户的地址（通过手机号验证）
      // 将两者都转换为字符串进行比较，避免类型不匹配
      if (String(address.user_phone) !== String(finalUserPhone)) {
        return Response.forbidden(res, '无权操作该地址');
      }

      await AddressModel.setDefault(finalUserPhone, id);

      return Response.success(res, null, '设置成功');
    } catch (error) {
      console.error('设置默认地址错误:', error);
      return Response.serverError(res, '设置失败');
    }
  }
}

module.exports = AddressController;
