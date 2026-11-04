const db = require('../config/database');
const Response = require('../utils/response');
const { refreshCache } = require('../middleware/ipAccess');

/**
 * 受限地区配置（管理端）
 * 数据来自 iptable：按 IPName（城市）聚合，isOpen='true' 表示该地区禁止访问
 */
class IpAccessController {
  /**
   * 城市列表（按城市聚合）
   * 支持 keyword 按城市名模糊搜索
   */
  static async getCities(req, res) {
    try {
      const keyword = String(req.query.keyword || '').trim();

      let where = "WHERE IPName IS NOT NULL AND IPName <> ''";
      const params = [];

      if (keyword) {
        where += ' AND IPName LIKE ?';
        params.push(`%${keyword}%`);
      }

      const sql = `
        SELECT IPName AS name,
               COUNT(*) AS segments,
               MAX(CASE WHEN isOpen = 'true' THEN 1 ELSE 0 END) AS isOpen
        FROM iptable
        ${where}
        GROUP BY IPName
        ORDER BY isOpen DESC, name ASC
      `;

      const [rows] = await db.query(sql, params);
      const list = rows.map(row => ({
        name: row.name,
        segments: Number(row.segments),
        isOpen: Number(row.isOpen) === 1
      }));

      return Response.success(res, {
        list,
        total: list.length,
        restricted: list.filter(item => item.isOpen).length
      });
    } catch (error) {
      console.error('获取受限地区列表错误:', error);
      return Response.serverError(res, '获取受限地区列表失败');
    }
  }

  /**
   * 设置某个地区是否禁止访问（该城市下所有 IP 段一起生效）
   */
  static async updateCityStatus(req, res) {
    try {
      const name = String(req.body.name || '').trim();
      const isOpen = [true, 'true', 1, '1'].includes(req.body.isOpen);

      if (!name) {
        return Response.validateError(res, '城市名称不能为空');
      }

      const [result] = await db.query(
        'UPDATE iptable SET isOpen = ? WHERE IPName = ?',
        [isOpen ? 'true' : 'false', name]
      );

      if (result.affectedRows === 0) {
        return Response.notFound(res, '未找到该城市的 IP 段');
      }

      // 立即刷新内存缓存，配置实时生效
      await refreshCache();

      return Response.success(
        res,
        { name, isOpen, affected: result.affectedRows },
        isOpen ? '已禁止该地区访问' : '已恢复该地区访问'
      );
    } catch (error) {
      console.error('更新地区访问状态错误:', error);
      return Response.serverError(res, '更新地区访问状态失败');
    }
  }

  /**
   * 手动刷新 IP 段缓存
   */
  static async refreshCache(req, res) {
    try {
      await refreshCache();
      return Response.success(res, null, '缓存已刷新');
    } catch (error) {
      console.error('刷新 IP 段缓存错误:', error);
      return Response.serverError(res, '刷新缓存失败');
    }
  }
}

module.exports = IpAccessController;
