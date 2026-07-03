require('dotenv').config();
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

async function importProducts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clothing_shop'
  });

  try {
    console.log('========================================');
    console.log('开始导入商品数据');
    console.log('========================================\n');

    // 读取 Excel 文件
    const excelFilePath = 'C:\\Users\\admin\\Desktop\\新建文件夹\\测试数据.xlsx';
    console.log(`读取文件: ${excelFilePath}`);

    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`找到 ${data.length} 条商品记录\n`);
    console.log('----------------------------------------\n');

    // 开始导入
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // 检查是否有商品名称（跳过空行）
        if (!row['商品名称']) {
          skipCount++;
          console.log(`⏭️  [${i + 1}/${data.length}] 跳过空行`);
          continue;
        }

        // 提取图片ID（从 Excel 公式中）
        let mainImage = '';
        if (row['主图'] && typeof row['主图'] === 'string') {
          const match = row['主图'].match(/DISPIMG\("([^"]+)"/);
          if (match) {
            mainImage = match[1]; // 或者构建实际的图片URL
          }
        }

        // 构建商品数据
        const productData = {
          category_id: 12, // 使用现有分类 "童装1"
          spec_ids: null,
          name: row['商品名称'] || '',
          subtitle: row['简介'] || '',
          main_image: mainImage || '',
          images: null,
          images1: null,
          images2: null,
          images3: null,
          images4: null,
          images5: null,
          detail: row['简介'] || '',
          price: row['价格'] || '0.00',
          original_price: row['价格'] || '0.00',
          cost_price: '0.00',
          stock: 100, // 默认库存
          sku_list: null,
          attributes: null,
          is_hot: 0,
          is_new: 0,
          is_recommend: 0,
          status: 1,
          sort_order: 0
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
          productData.images,
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
          productData.sku_list,
          productData.attributes,
          productData.is_hot,
          productData.is_new,
          productData.is_recommend,
          productData.status,
          productData.sort_order
        ];

        await connection.query(sql, values);
        successCount++;

        console.log(`✅ [${i + 1}/${data.length}] ${productData.name} - ¥${productData.price}`);

      } catch (err) {
        errorCount++;
        console.error(`❌ [${i + 1}/${data.length}] 导入失败:`, err.message);
      }
    }

    console.log('\n========================================');
    console.log('导入完成！');
    console.log('========================================');
    console.log(`总计: ${data.length} 条`);
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`⏭️  跳过: ${skipCount} 条`);
    console.log(`❌ 失败: ${errorCount} 条`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 发生错误:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

importProducts();
