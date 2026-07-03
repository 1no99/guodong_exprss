const Response = require('../utils/response');

class UploadController {
  /**
   * 上传头像
   */
  static async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return Response.validateError(res, '请选择要上传的文件');
      }

      // 返回文件访问URL
      const fileUrl = `/uploads/avatars/${req.file.filename}`;

      return Response.success(res, {
        url: fileUrl,
        filename: req.file.filename,
      }, '上传成功');
    } catch (error) {
      console.error('上传头像错误:', error);
      return Response.serverError(res, '上传失败');
    }
  }

  /**
   * 上传商品图片到 sysimg 目录
   */
  static async uploadSysimg(req, res) {
    try {
      if (!req.file) {
        return Response.validateError(res, '请选择要上传的文件');
      }

      const fileUrl = `/sysimg/${req.file.filename}`;

      return Response.success(res, {
        url: fileUrl,
        filename: req.file.filename,
      }, '上传成功');
    } catch (error) {
      console.error('上传 sysimg 错误:', error);
      return Response.serverError(res, '上传失败');
    }
  }
}

module.exports = UploadController;
