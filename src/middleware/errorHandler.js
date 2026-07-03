const Response = require('../utils/response');

/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return Response.error(res, '数据已存在', 400, 2001);
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return Response.unauthorized(res, 'Token无效');
  }

  if (err.name === 'TokenExpiredError') {
    return Response.unauthorized(res, 'Token已过期');
  }

  // 自定义错误
  if (err.code) {
    return Response.error(res, err.message, err.status || 400, err.code);
  }

  // 默认服务器错误
  return Response.serverError(res, '服务器内部错误');
};

/**
 * 404处理中间件
 */
const notFoundHandler = (req, res) => {
  Response.notFound(res, '请求的API不存在');
};

module.exports = {
  errorHandler,
  notFoundHandler
};
