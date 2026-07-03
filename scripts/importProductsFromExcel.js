require('dotenv').config();
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

async function importProductsFromExcel() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('开始导入商品数据...\n');

    // 读取 Excel 文件
    const excelFilePath = 'C:\\Users\\admin\\Desktop\\新建文件夹\\测试数据.xlsx';
    console.log(`读取文件: ${excelFilePath}`);

    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`找到 ${data.length} 条商品记录\n`);

    // 显示前3条数据预览
    console.log('前3条数据预览:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    console.log('\n========================================\n');

    // 开始导入
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // 映射 Excel 列名到数据库字段
        // 根据实际 Excel 列名调整
        const productData = {
          category_id: row['分类ID'] || row['category_id'] || 1,
          spec_ids: row['规格ID'] || row['spec_ids'] || null,
          name: row['商品名称'] || row['name'] || row['商品名'] || '',
          subtitle: row['副标题'] || row['subtitle'] || row['简介'] || '',
          main_image: row['主图'] || row['main_image'] || row['图片'] || '',
          images: row['图片列表'] || row['images'] || null,
          images1: row['图片1'] || row['images1'] || null,
          images2: row['图片2'] || row['images2'] || null,
          images3: row['图片3'] || row['images3'] || null,
          images4: row['图片4'] || row['images4'] || null,
          images5: row['图片5'] || row['images5'] || null,
          detail: row['详情'] || row['detail'] || row['商品详情'] || '',
          price: row['价格'] || row['price'] || '0.00',
          original_price: row['原价'] || row['original_price'] || row['价格'] || '0.00',
          cost_price: row['成本价'] || row['cost_price'] || '0.00',
          stock: row['库存'] || row['stock'] || 0,
          sku_list: row['SKU列表'] || row['sku_list'] || null,
          attributes: row['属性'] || row['attributes'] || null,
          is_hot: row['是否热销'] || row['is_hot'] || 0,
          is_new: row['是否新品'] || row['is_new'] || 0,
          is_recommend: row['是否推荐'] || row['is_recommend'] || 0,
          status: row['状态'] || row['status'] || 1,
          sort_order: row['排序'] || row['sort_order'] || 0
        };

        // 插入数据库
        const sql = `
          INSERT INTO products
          (category_id, spec_ids, name, subtitle, main_image, images, images1, images2, images3, images4, images5,
           detail, price, original_price, cost_price, stock, sku_list, attributes,
           is_hot, is_new, is_recommend, status, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          productData.category_id,
          productData.spec_ids,
          productData.name,
          productData.subtitle,
          productData.main_image,
          productData.images ? JSON.stringify(productData.images) : null,
          productData.images1,
          productData.images2,
          productData.images3,
          productData.images4,
          productData.images5,
          productData.detail,
          productData.price,
          productData.original_price,
          productData.cost_price,
          productData.stock,
          productData.sku_list ? JSON.stringify(productData.sku_list) : null,
          productData.attributes ? JSON.stringify(productData.attributes) : null,
          productData.is_hot,
          productData.is_new,
          productData.is_recommend,
          productData.status,
          productData.sort_order
        ];

        await connection.query(sql, values);
        successCount++;
        console.log(`✅ [${i + 1}/${data.length}] ${productData.name}`);

      } catch (err) {
        errorCount++;
        console.error(`❌ [${i + 1}/${data.length}] 导入失败:`, err.message);
        console.error('   数据:', JSON.stringify(row, null, 2));
      }
    }

    console.log('\n========================================');
    console.log('导入完成！');
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${errorCount} 条`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

importProductsFromExcel();
