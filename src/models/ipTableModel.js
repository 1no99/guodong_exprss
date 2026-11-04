const db = require('../config/database');

/**
 * iptable 模型
 * 字段：IP（CIDR 段，如 1.0.1.0/24）、IPName（归属地，如 广东省广州市）、
 *       isOpen（是否限制访问，varchar 存储 'true'/'false'）
 */
class IpTableModel {
  /**
   * 获取全部 IP 段（访问控制中间件加载到内存使用）
   */
  static async getAll() {
    const [rows] = await db.query('SELECT IP, IPName, isOpen FROM iptable');
    return rows;
  }

  /**
   * 更新某条记录是否限制访问
   */
  static async updateIsOpen(ip, isOpen) {
    await db.query('UPDATE iptable SET isOpen = ? WHERE IP = ?', [String(isOpen), ip]);
  }

  /**
   * 按城市批量开启/关闭访问（城市下所有 IP 段一起生效）
   */
  static async updateIsOpenByCity(ipName, isOpen) {
    const [result] = await db.query('UPDATE iptable SET isOpen = ? WHERE IPName = ?', [String(isOpen), ipName]);
    return result.affectedRows;
  }
}

module.exports = IpTableModel;
