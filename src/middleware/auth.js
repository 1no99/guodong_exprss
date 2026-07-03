const { verifyToken } = require('../config/jwt');
const Response = require('../utils/response');

/**
 * 认证中间件 - 验证用户身份
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return Response.unauthorized(res, '请先登录');
    }

    // 验证token
    const decoded = verifyToken(token);

    // 将用户信息附加到请求对象
    req.user = {
      id: decoded.id,
      openid: decoded.openid,
      phone: decoded.phone
    };

    next();
  } catch (error) {
    return Response.unauthorized(res, 'Token无效或已过期');
  }
};

/**
 * 可选认证中间件 - 不强制要求登录
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        openid: decoded.openid,
        phone: decoded.phone
      };
    }

    next();
  } catch (error) {
    // token无效时继续执行，但不设置用户信息
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth
};
