require('dotenv').config();
const XLSX = require('xlsx');

async function previewExcel() {
  try {
    console.log('读取 Excel 文件...\n');

    // 读取 Excel 文件
    const excelFilePath = 'C:\\Users\\admin\\Desktop\\新建文件夹\\测试数据.xlsx';
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`总记录数: ${data.length}\n`);

    if (data.length > 0) {
      console.log('Excel 列名:');
      console.log('----------------------------------------');
      const columns = Object.keys(data[0]);
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });

      console.log('\n========================================\n');

      console.log('前3条数据:');
      console.log('----------------------------------------');
      data.slice(0, 3).forEach((row, index) => {
        console.log(`\n第 ${index + 1} 条:`);
        console.log(JSON.stringify(row, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

previewExcel();
