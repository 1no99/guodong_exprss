const db = require('../config/database');

class GoodTypeModel {
  /**
   * 根据规格ID获取单个规格
   */
  static async findById(id) {
    const sql = 'SELECT * FROM goodtype WHERE id = ?';
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  }

  /**
   * 根据商品ID获取规格列表
   */
  static async getByProductId(productId) {
    const sql = 'SELECT * FROM goodtype WHERE goodid = ?';
    const [rows] = await db.query(sql, [productId]);
    return rows;
  }

  /**
   * 根据商品ID删除规格
   */
  static async deleteByProductId(productId) {
    const sql = 'DELETE FROM goodtype WHERE goodid = ?';
    await db.query(sql, [productId]);
  }

  /**
   * 批量创建规格（事务内调用）
   */
  static async createBatch(productId, specs) {
    if (!specs || specs.length === 0) return;

    const sql = `
      INSERT INTO goodtype (goodid, price, parentName, childName, stock, typeimg, etx1, etx2, etx3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const spec of specs) {
      const params = [
        productId,
        spec.price || 0,
        spec.parentName || '',
        spec.childName || '',
        spec.stock || 0,
        spec.typeimg || null,
        spec.etx1 || null,
        spec.etx2 || null,
        spec.etx3 || null
      ];
      await db.query(sql, params);
    }
  }

  /**
   * 更新商品规格（智能更新：有id则更新，无id则新增，多余的删除）
   */
  static async replaceSpecs(productId, specs) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 获取现有的规格
      const [existingSpecs] = await connection.query('SELECT id FROM goodtype WHERE goodid = ?', [productId]);
      const existingIds = existingSpecs.map(s => s.id);

      // 处理传入的规格
      const processedIds = [];
      if (specs && specs.length > 0) {
        for (const spec of specs) {
          const specId = spec.id ? parseInt(spec.id) : null;
          if (specId && existingIds.includes(specId)) {
            // 更新已有规格
            await connection.query(
              'UPDATE goodtype SET price = ?, parentName = ?, childName = ?, stock = ?, typeimg = ?, etx1 = ?, etx2 = ?, etx3 = ? WHERE id = ? AND goodid = ?',
              [spec.price || 0, spec.parentName || '', spec.childName || '', spec.stock || 0, spec.typeimg || null, spec.etx1 || null, spec.etx2 || null, spec.etx3 || null, specId, productId]
            );
            processedIds.push(specId);
          } else {
            // 新增规格
            const [result] = await connection.query(
              'INSERT INTO goodtype (goodid, price, parentName, childName, stock, typeimg, etx1, etx2, etx3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [productId, spec.price || 0, spec.parentName || '', spec.childName || '', spec.stock || 0, spec.typeimg || null, spec.etx1 || null, spec.etx2 || null, spec.etx3 || null]
            );
            processedIds.push(result.insertId);
          }
        }
      }

      // 删除不再需要的规格
      const idsToDelete = existingIds.filter(id => !processedIds.includes(id));
      if (idsToDelete.length > 0) {
        await connection.query('DELETE FROM goodtype WHERE id IN (?)', [idsToDelete]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = GoodTypeModel;