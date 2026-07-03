/**
 * 清理无引用的孤立图片文件
 * 
 * 功能：
 * 1. 扫描 uploads/ 下所有图片文件
 * 2. 查询数据库中所有引用图片的字段
 * 3. 找出不在任何数据库字段中引用的孤立文件
 * 4. 可选择删除或仅列出
 * 
 * 用法：
 *   node scripts/cleanupOrphanImages.js              # 仅列出，不删除
 *   node scripts/cleanupOrphanImages.js --delete      # 确认后删除
 *   node scripts/cleanupOrphanImages.js --delete --force  # 跳过确认直接删除
 *   node scripts/cleanupOrphanImages.js --dry-run     # 模拟运行
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const db = require('../src/config/database');

// 项目根目录
const ROOT_DIR = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// 图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

// 数据库中存储图片路径的列（表名.列名）
const IMAGE_COLUMNS = [
  { table: 'users', column: 'avatar' },
  { table: 'products', column: 'main_image' },
  { table: 'products', column: 'images' },
  { table: 'products', column: 'detail' },
  { table: 'banners', column: 'image' },
  { table: 'categories', column: 'icon' },
  { table: 'order_items', column: 'product_image' },
];

// 从文件路径中提取文件名
function extractFilename(imagePath) {
  if (!imagePath) return null;
  // 去掉查询参数
  const cleanPath = imagePath.split('?')[0];
  // 提取文件名
  return path.basename(cleanPath);
}

// 从 JSON 数组中提取所有图片文件名
function extractFilenamesFromJson(jsonStr) {
  const filenames = [];
  try {
    const arr = JSON.parse(jsonStr);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const fn = extractFilename(String(item));
        if (fn) filenames.push(fn);
      }
    }
  } catch (e) {
    // 尝试提取 JSON 中的 URL 路径
    const matches = jsonStr.match(/\/[^\/\\]+\.(jpg|jpeg|png|gif|webp|bmp)/gi);
    if (matches) {
      for (const m of matches) {
        const fn = path.basename(m);
        if (fn) filenames.push(fn);
      }
    }
  }
  return filenames;
}

// 从 HTML 内容中提取图片文件名
function extractFilenamesFromHtml(html) {
  const filenames = [];
  if (!html) return filenames;
  // 匹配 img src 中的图片路径
  const imgRegex = /src\s*=\s*["']([^"']+\.(jpg|jpeg|png|gif|webp|bmp))["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const fn = path.basename(match[1]);
    if (fn) filenames.push(fn);
  }
  return filenames;
}

// 递归扫描目录获取所有图片文件
function scanImageFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanImageFiles(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// 收集数据库中所有引用的图片文件名
async function collectReferencedImages() {
  const referenced = new Set();

  for (const { table, column } of IMAGE_COLUMNS) {
    try {
      // 检查表和列是否存在
      const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );

      if (cols.length === 0) {
        console.log(`  跳过: ${table}.${column} (表或列不存在)`);
        continue;
      }

      const [rows] = await db.query(`SELECT \`${column}\` FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`);
      
      let count = 0;
      for (const row of rows) {
        const value = String(row[column]);
        let filenames = [];

        // products.detail 是 HTML 内容
        if (table === 'products' && column === 'detail') {
          filenames = extractFilenamesFromHtml(value);
        }
        // products.images 是 JSON 数组
        else if (table === 'products' && column === 'images') {
          filenames = extractFilenamesFromJson(value);
        }
        // products.sku_list 和 products.attributes 也可能包含图片
        else if (table === 'products' && (column === 'sku_list' || column === 'attributes')) {
          filenames = extractFilenamesFromJson(value);
        }
        // 其他字段直接提取文件名
        else {
          const fn = extractFilename(value);
          if (fn) filenames.push(fn);
        }

        for (const fn of filenames) {
          referenced.add(fn);
          count++;
        }
      }
      console.log(`  ${table}.${column}: 引用了 ${count} 张图片`);
    } catch (error) {
      console.error(`  错误查询 ${table}.${column}: ${error.message}`);
    }
  }

  // 额外检查 products.sku_list 和 products.attributes（可能包含图片路径）
  try {
    const skuRows = await db.query(`SELECT sku_list, attributes FROM products WHERE sku_list IS NOT NULL OR attributes IS NOT NULL`);
    for (const row of skuRows[0]) {
      if (row.sku_list) {
        const fns = extractFilenamesFromJson(row.sku_list);
        for (const fn of fns) referenced.add(fn);
      }
      if (row.attributes) {
        const fns = extractFilenamesFromJson(row.attributes);
        for (const fn of fns) referenced.add(fn);
      }
    }
  } catch (e) {
    // 忽略
  }

  return referenced;
}

// 确认用户输入
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function main() {
  const args = process.argv.slice(2);
  const deleteMode = args.includes('--delete');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('========================================');
  console.log('  孤立图片清理工具');
  console.log('========================================');
  console.log(`  模式: ${deleteMode ? (force ? '删除模式(跳过确认)' : '删除模式') : dryRun ? '模拟运行' : '仅列出'}`);
  console.log(`  扫描目录: ${UPLOADS_DIR}`);
  console.log('');

  // 1. 扫描文件系统
  console.log('[1/3] 扫描 uploads 目录...');
  const allFiles = scanImageFiles(UPLOADS_DIR);
  console.log(`  找到 ${allFiles.length} 个图片文件\n`);

  // 2. 收集数据库引用
  console.log('[2/3] 查询数据库引用...');
  const referenced = await collectReferencedImages();
  console.log(`  共 ${referenced.size} 个文件被数据库引用\n`);

  // 3. 找出孤立文件
  console.log('[3/3] 检查孤立文件...');
  const orphans = [];
  let totalSize = 0;

  for (const filePath of allFiles) {
    const filename = path.basename(filePath);
    if (!referenced.has(filename)) {
      const stat = fs.statSync(filePath);
      orphans.push({ path: filePath, filename, size: stat.size, mtime: stat.mtime });
      totalSize += stat.size;
    }
  }

  console.log(`  找到 ${orphans.length} 个孤立文件，共 ${formatSize(totalSize)}\n`);

  if (orphans.length === 0) {
    console.log('没有需要清理的文件！');
    await db.end();
    return;
  }

  // 列出孤立文件
  console.log('孤立文件列表:');
  console.log('─'.repeat(80));
  for (const [i, file] of orphans.entries()) {
    const relPath = path.relative(ROOT_DIR, file.path);
    console.log(`  ${i + 1}. ${relPath} (${formatSize(file.size)}, 修改于 ${file.mtime.toLocaleDateString()})`);
  }
  console.log('─'.repeat(80));
  console.log(`  合计: ${orphans.length} 个文件, ${formatSize(totalSize)}`);
  console.log('');

  if (dryRun) {
    console.log('模拟运行，未删除任何文件。');
    await db.end();
    return;
  }

  if (!deleteMode) {
    console.log('提示: 使用 --delete 参数执行删除，例如:');
    console.log('  node scripts/cleanupOrphanImages.js --delete');
    console.log('  node scripts/cleanupOrphanImages.js --delete --force  # 跳过确认');
    await db.end();
    return;
  }

  // 确认删除
  let proceed = true;
  if (!force) {
    proceed = await confirm(`确认要删除这 ${orphans.length} 个文件吗？(y/N): `);
  } else {
    console.log('已启用 --force，跳过确认直接删除。');
  }
  if (!proceed) {
    console.log('已取消。');
    await db.end();
    return;
  }

  // 执行删除
  let deleted = 0;
  let failed = 0;
  for (const file of orphans) {
    try {
      fs.unlinkSync(file.path);
      deleted++;
    } catch (error) {
      console.error(`  删除失败: ${file.filename} - ${error.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`清理完成: 成功删除 ${deleted} 个文件，失败 ${failed} 个`);
  console.log(`释放空间: ${formatSize(totalSize)}`);

  await db.end();
}

main().catch(error => {
  console.error('脚本执行出错:', error);
  process.exit(1);
});
