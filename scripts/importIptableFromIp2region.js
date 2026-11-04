/**
 * 将 ip2region 离线库中「中国」的 IP 段导入 iptable 表
 *
 * 用法：
 *   node scripts/importIptableFromIp2region.js <ip2region.xdb 路径> [--dry-run]
 *
 * 数据格式：每行 = 一个 CIDR 段
 *   IP     : 如 1.0.1.0/24
 *   IPName : 归属地，如 福建省福州市
 *   isOpen : 默认 false
 *
 * 说明：仅导入中国（含港澳台）的段；若某段没有城市信息，则使用省份。
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/database');

const HEADER_LENGTH = 256;
const VECTOR_INDEX_LENGTH = 256 * 256 * 8; // 65536 个桶，每桶 8 字节
const SEGMENT_SIZE = 14; // start(4) + end(4) + dataLen(2) + dataPtr(4)
const BATCH_SIZE = 500;

function intToIp(num) {
  return [num >>> 24, (num >> 16) & 255, (num >> 8) & 255, num & 255].join('.');
}

/**
 * 将一个 [start, end] IP 段转换为若干 CIDR
 */
function rangeToCidrs(start, end) {
  const result = [];
  while (start <= end) {
    const lowbit = start === 0 ? 0 : ((start & -start) >>> 0);
    const alignPrefix = lowbit === 0 ? 0 : 32 - Math.log2(lowbit);

    const remaining = end - start + 1;
    const sizePrefix = 32 - Math.floor(Math.log2(remaining));
    const prefix = Math.max(alignPrefix, sizePrefix);

    result.push(`${intToIp(start)}/${prefix}`);
    start += 2 ** (32 - prefix);
  }
  return result;
}

/**
 * 省市拼接（北京市/北京市 -> 北京市，广东省/深圳市 -> 广东省深圳市）
 */
function joinName(province, city) {
  const parts = [province, city]
    .map(p => (p || '').trim())
    .filter(p => p && p !== '0');
  return [...new Set(parts)].join('');
}

/**
 * 读取 xdb 中所有段
 */
function readSegments(buffer) {
  const vectorEntry = index => ({
    start: buffer.readUInt32LE(HEADER_LENGTH + index * 8),
    end: buffer.readUInt32LE(HEADER_LENGTH + index * 8 + 4)
  });

  const first = vectorEntry(0);
  const last = vectorEntry(256 * 256 - 1);
  const total = (last.end - first.start) / SEGMENT_SIZE;

  const segments = [];
  for (let i = 0; i < total; i++) {
    const ptr = first.start + i * SEGMENT_SIZE;
    const start = buffer.readUInt32LE(ptr);
    const end = buffer.readUInt32LE(ptr + 4);
    const dataLen = buffer.readUInt16LE(ptr + 8);
    const dataPtr = buffer.readUInt32LE(ptr + 10);

    if (end < start) continue;
    if (dataPtr + dataLen > buffer.length) continue;

    const region = buffer.toString('utf8', dataPtr, dataPtr + dataLen);
    segments.push({ start, end, region });
  }

  return segments;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dbPath = args.find(arg => arg !== '--dry-run');

  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error('请传入有效的 ip2region.xdb 路径，例如：');
    console.error('  node scripts/importIptableFromIp2region.js ./data/ip2region.xdb');
    process.exit(1);
  }

  console.log(`读取离线库：${dbPath}`);
  const buffer = fs.readFileSync(dbPath);
  const segments = readSegments(buffer);
  console.log(`解析到 IP 段：${segments.length}`);

  const rows = [];
  let chinaSegments = 0;

  for (const seg of segments) {
    const parts = seg.region.split('|');
    // 字段：国家|省份|城市|ISP|国家代码
    if (parts[0] !== '中国') continue;

    chinaSegments++;
    const name = joinName(parts[1], parts[2]);
    if (!name) continue;

    for (const cidr of rangeToCidrs(seg.start, seg.end)) {
      rows.push([cidr, name, 'false']);
    }
  }

  const citySet = new Set(rows.map(r => r[1]));
  console.log(`中国 IP 段：${chinaSegments}，转换后 CIDR 记录：${rows.length}，涉及省市：${citySet.size}`);
  console.log('示例：');
  console.log(rows.slice(0, 5));

  if (dryRun) {
    console.log('--dry-run，未写入数据库');
    process.exit(0);
  }

  // 清理之前导入的 CIDR 数据，保证脚本可重复执行；保留运行时记录的精确 IP
  const [deleted] = await db.query("DELETE FROM iptable WHERE IP LIKE '%/%'");
  console.log(`清理旧 CIDR 记录：${deleted.affectedRows} 条`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.query('INSERT INTO iptable (IP, IPName, isOpen) VALUES ?', [batch]);
    inserted += batch.length;
    if (inserted % 10000 < BATCH_SIZE) {
      console.log(`已写入：${inserted}/${rows.length}`);
    }
  }

  const [[{ count }]] = await db.query("SELECT COUNT(*) AS count FROM iptable WHERE IP LIKE '%/%'");
  console.log(`导入完成，表中 CIDR 记录总数：${count}`);

  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM iptable');
  console.log(`表中总记录数：${total}`);

  process.exit(0);
}

main().catch(error => {
  console.error('导入失败：', error);
  process.exit(1);
});
