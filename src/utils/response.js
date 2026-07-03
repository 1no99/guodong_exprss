/**
 * 统一响应格式
 */
class Response {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功', code = 200) {
    return res.status(code).json({
      code: 0,
      message,
      data
    });
  }

  /**
   * 失败响应
   */
  static error(res, message = '操作失败', code = 400, errorCode = -1) {
    return res.status(code).json({
      code: errorCode,
      message,
      data: null
    });
  }

  /**
   * 参数错误
   */
  static validateError(res, message = '参数错误') {
    return this.error(res, message, 400, 1001);
  }

  /**
   * 未授权
   */
  static unauthorized(res, message = '未授权，请先登录') {
    return this.error(res, message, 401, 1002);
  }

  /**
   * 禁止访问
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, message, 403, 1003);
  }

  /**
   * 资源不存在
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404, 1004);
  }

  /**
   * 服务器错误
   */
  static serverError(res, message = '服务器错误') {
    return this.error(res, message, 500, 1005);
  }
}

module.exports = Response;
