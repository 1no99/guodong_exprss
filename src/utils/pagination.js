/**
 * 分页工具函数
 */
class Pagination {
  /**
   * 获取分页参数
   */
  static getParams(page = 1, pageSize = 10) {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const currentPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (currentPage - 1) * currentPageSize;

    return {
      page: currentPage,
      pageSize: currentPageSize,
      offset
    };
  }

  /**
   * 格式化分页响应数据
   */
  static format(data, total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize);

    return {
      list: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }
}

module.exports = Pagination;
