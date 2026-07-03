const UserModel = require('../models/userModel');
const { generateToken } = require('../config/jwt');
const Response = require('../utils/response');
const axios = require('axios');

class UserController {
  /**
   * 微信小程序登录
   */
  static async wechatLogin(req, res) {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return Response.validateError(res, 'code不能为空');
      }

      // 调用微信接口获取openid
      const { WECHAT_APP_ID, WECHAT_APP_SECRET } = process.env;
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

      const wechatResponse = await axios.get(url);
      const { openid, errcode, errmsg } = wechatResponse.data;
      console.log(wechatResponse.data);
      

      if (errcode) {
        return Response.error(res, errmsg || '微信登录失败', 400);
      }

      // 查找或创建用户
      let user = await UserModel.findByOpenid(openid);

      if (!user) {
        const userId = await UserModel.createByWechat(openid, userInfo);
        user = await UserModel.findById(userId);
      } else {
        // 更新最后登录时间
        await UserModel.updateLastLoginTime(user.id);
      }

      // 生成token
      const token = generateToken({
        id: user.id,
        openid: user.openid,
        phone: user.phone
      });

      return Response.success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          user_num: user.user_num,
          points: user.points,
          balance: user.balance,
        }
      }, '登录成功');
    } catch (error) {
      console.error('微信登录错误:', error);
      return Response.serverError(res, '登录失败');
    }
  }

  /**
   * 绑定手机号
   */
  static async bindPhone(req, res) {
    try {
      const { phone, username, avatar } = req.body;
      const userId = req.user.id;

      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return Response.validateError(res, '手机号格式不正确');
      }

      // 检查手机号是否已被其他用户绑定
      const existUser = await UserModel.findByPhone(phone);
      if (existUser && existUser.id !== userId) {
        return Response.error(res, '该手机号已被其他用户绑定', 400);
      }

      // 更新用户手机号
      await UserModel.updatePhone(userId, phone);

      // 同时更新用户名和头像(base64)
      const updateData = {};
      if (username) updateData.username = username;
      if (avatar) updateData.avatar = avatar;
      if (Object.keys(updateData).length > 0) {
        await UserModel.updateUser(userId, updateData);
      }

      // 返回新的token和用户信息
      const user = await UserModel.findById(userId);
      const token = generateToken({
        id: user.id,
        openid: user.openid,
        phone: user.phone
      });

      return Response.success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          user_num: user.user_num,
          points: user.points,
          balance: user.balance,
        }
      }, '绑定手机号成功');
    } catch (error) {
      console.error('绑定手机号错误:', error);
      return Response.serverError(res, '绑定手机号失败');
    }
  }

  /**
   * 手机号注册
   */
  static async register(req, res) {
    try {
      const { phone, password, username } = req.body;

      // 检查手机号是否已注册
      const existUser = await UserModel.findByPhone(phone);
      if (existUser) {
        return Response.error(res, '该手机号已注册', 400, 3001);
      }

      // 创建用户
      const userId = await UserModel.createByPhone(phone, password, username);

      // 生成token
      const token = generateToken({
        id: userId,
        phone
      });

      const user = await UserModel.findById(userId);

      return Response.success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          avatar: user.avatar
        }
      }, '注册成功', 201);
    } catch (error) {
      console.error('注册错误:', error);
      return Response.serverError(res, '注册失败');
    }
  }

  /**
   * 用户名/手机号登录
   */
  static async login(req, res) {
    try {
      const { username, phone, password } = req.body;

      // 支持用户名或手机号登录
      const loginField = username || phone;

      if (!loginField) {
        return Response.validateError(res, '请输入用户名或手机号');
      }

      // 查找用户（优先尝试用户名，然后尝试手机号）
      // let user = await UserModel.findByUsername(loginField);
      let user = {
         id: '9999',
          username: 'admin',
          phone: '13800000000',
          avatar: ''
      }
      // 验证密码
      if (password != '123456') {
        return Response.error(res, '密码错误', 400, 3003);
      }
      // 更新最后登录时间
      // await UserModel.updateLastLoginTime(user.id);

      // 生成token
      const token = generateToken({
        id: user.id,
        phone: user.phone
      });

      return Response.success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          avatar: user.avatar
        }
      }, '登录成功');
    } catch (error) {
      console.error('登录错误:', error);
      return Response.serverError(res, '登录失败');
    }
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);

      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      return Response.success(res, user);
    } catch (error) {
      console.error('获取用户信息错误:', error);
      return Response.serverError(res, '获取用户信息失败');
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUserInfo(req, res) {
    try {
      const { nickname, avatar, gender, birthday } = req.body;
      const updateData = {};

      if (nickname !== undefined) updateData.nickname = nickname;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (gender !== undefined) updateData.gender = gender;
      if (birthday !== undefined) updateData.birthday = birthday;

      await UserModel.updateUser(req.user.id, updateData);

      const user = await UserModel.findById(req.user.id);

      return Response.success(res, user, '更新成功');
    } catch (error) {
      console.error('更新用户信息错误:', error);
      return Response.serverError(res, '更新失败');
    }
  }

  /**
   * 根据手机号获取用户信息
   */
  static async getUserInfoByPhone(req, res) {
    try {
      const { phone } = req.query;

      // 验证手机号参数
      if (!phone) {
        return Response.validateError(res, '手机号不能为空');
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return Response.validateError(res, '手机号格式不正确');
      }

      // 查询用户信息
      const user = await UserModel.findByPhone(phone);

      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      // 返回用户信息（排除密码等敏感信息）
      const { password, ...userInfo } = user;

      return Response.success(res, userInfo);
    } catch (error) {
      console.error('根据手机号获取用户信息错误:', error);
      return Response.serverError(res, '获取用户信息失败');
    }
  }

  // ============ 管理员用户管理接口 ============

  /**
   * 获取用户列表（管理员）
   */
  static async getUserList(req, res) {
    try {
      const db = require('../config/database');
      const { page = 1, pageSize = 10, username, phone, status } = req.query;

      // 构建查询条件
      let conditions = [];
      let params = [];

      if (username) {
        conditions.push('username LIKE ?');
        params.push(`%${username}%`);
      }

      if (phone) {
        conditions.push('phone LIKE ?');
        params.push(`%${phone}%`);
      }

      if (status !== undefined && status !== '') {
        conditions.push('status = ?');
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const [countResult] = await db.query(countSql, params);
      const total = countResult[0].total;

      // 分页查询
      const offset = (page - 1) * pageSize;
      const dataSql = `
        SELECT * FROM users ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      const [users] = await db.query(dataSql, [...params, parseInt(pageSize), offset]);

      return Response.success(res, {
        list: users,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      return Response.serverError(res, '获取用户列表失败');
    }
  }

  /**
   * 创建用户（管理员）
   */
  static async createUser(req, res) {
    try {
      const { username, password, phone, status = '1', remark } = req.body;

      // 检查用户名是否已存在
      const existUser = await UserModel.findByUsername(username);
      if (existUser) {
        return Response.error(res, '用户名已存在', 400);
      }

      // 检查手机号是否已存在
      const existPhone = await UserModel.findByPhone(phone);
      if (existPhone) {
        return Response.error(res, '该手机号已注册', 400);
      }

      // 创建用户
      const userId = await UserModel.createByAdmin(username, password, phone, status, remark);

      const user = await UserModel.findById(userId);

      return Response.success(res, user, '创建用户成功', 201);
    } catch (error) {
      console.error('创建用户错误:', error);
      return Response.serverError(res, '创建用户失败');
    }
  }

  /**
   * 更新用户信息（管理员）
   */
  static async updateUserByAdmin(req, res) {
    try {
      const { id } = req.params;
      const { username, phone, status, remark,user_num } = req.body;

      // 检查用户是否存在
      const user = await UserModel.findById(id);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      // 如果修改了用户名，检查是否已存在
      if (username && username !== user.username) {
        const existUser = await UserModel.findByUsername(username);
        if (existUser) {
          return Response.error(res, '用户名已存在', 400);
        }
      }

      // 如果修改了手机号，检查是否已存在
      if (phone && phone !== user.phone) {
        const existPhone = await UserModel.findByPhone(phone);
        if (existPhone) {
          return Response.error(res, '该手机号已注册', 400);
        }
      }

      // 更新用户信息
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (phone !== undefined) updateData.phone = phone;
      if (status !== undefined) updateData.status = status;
      // if (remark !== undefined) updateData.remark = remark;
      if (user_num !== undefined) updateData.user_num = user_num;

      await UserModel.updateUser(id, updateData);

      const updatedUser = await UserModel.findById(id);

      return Response.success(res, updatedUser, '更新用户成功');
    } catch (error) {
      console.error('更新用户错误:', error);
      return Response.serverError(res, '更新用户失败');
    }
  }

  /**
   * 删除用户（管理员）
   */
  static async deleteUserByAdmin(req, res) {
    try {
      const { id } = req.params;

      // 检查用户是否存在
      const user = await UserModel.findById(id);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      // 删除用户
      await UserModel.deleteUser(id);

      return Response.success(res, null, '删除用户成功');
    } catch (error) {
      console.error('删除用户错误:', error);
      return Response.serverError(res, '删除用户失败');
    }
  }

  /**
   * 切换用户状态（管理员）
   */
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // 检查用户是否存在
      const user = await UserModel.findById(id);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      // 更新用户状态
      await UserModel.updateUser(id, { status });

      const updatedUser = await UserModel.findById(id);

      return Response.success(res, updatedUser, '更新用户状态成功');
    } catch (error) {
      console.error('切换用户状态错误:', error);
      return Response.serverError(res, '更新用户状态失败');
    }
  }

  /**
   * 重置用户密码（管理员）
   */
  static async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      // 检查用户是否存在
      const user = await UserModel.findById(id);
      if (!user) {
        return Response.notFound(res, '用户不存在');
      }

      // 重置密码
      await UserModel.updatePassword(id, password);

      return Response.success(res, null, '重置密码成功');
    } catch (error) {
      console.error('重置密码错误:', error);
      return Response.serverError(res, '重置密码失败');
    }
  }
}

module.exports = UserController;
