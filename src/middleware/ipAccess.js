const { getClientIp } = require('./clientIp');
const { verifyToken } = require('../config/jwt');
const IpTableModel = require('../models/ipTableModel');
const UserModel = require('../models/userModel');

/**
 * IP 访问控制中间件（按城市）
 *
 * 流程：
 * 1. 取网关最外层解析出的客户端 IP（req.clientIp）；
 * 2. 用 IP 在 iptable 的 CIDR 段中做范围匹配，得到所在城市（IPName）；
 * 3. 该城市任意一条记录 isOpen='true'，则抛出 IpForbiddenError；
 * 4. 例外：携带的 token 手机号存在于 superadmin 表中时放行。
 *
 * 性能：iptable 数据量约 9 万段，每次请求查库全表扫描代价太高，
 * 因此启动后加载到内存做二分查找，默认每 5 分钟后台刷新一次。
 *
 * 注意：数据库异常时选择放行，避免访问控制故障导致全站不可用。
 */

const CACHE_TTL = Number(process.env.IP_CACHE_TTL_MS) || 5 * 60 * 1000;
const RETRY_INTERVAL = 30 * 1000;
const SUPERADMIN_CACHE_TTL = Number(process.env.SUPERADMIN_CACHE_TTL_MS) || 60 * 1000;

/**
 * 登录/注册类接口不做地区限制：
 * 超级管理员只有登录并携带 token 后才能被识别，受限地区必须允许其先完成登录/绑定手机号。
 * 这些接口只负责签发身份，不返回业务数据，放行不会绕过地区限制。
 */
const AUTH_EXEMPT_PATHS = new Set([
  '/user/login',
  '/user/login/wechat',
  '/user/register',
  '/user/bindPhone'
]);

let cache = { ranges: [], blockedCities: new Set(), loadedAt: 0 };
let refreshing = null;
let retryAt = 0;

// superadmin 手机号白名单缓存（数据量很小，定时刷新）
let superAdminCache = { phones: new Set(), loadedAt: 0 };
let superAdminRefreshing = null;

/**
 * 地区访问受限异常
 * 前端可通过 code === 3001 识别
 */
class IpForbiddenError extends Error {
  constructor(ipName) {
    super(`当前IP所在地区（${ipName || '未知'}）暂未开放访问`);
    this.name = 'IpForbiddenError';
    this.code = 3001;
    this.status = 403;
  }
}

function isOpenTrue(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

/**
 * IPv4 字符串转整数，非 IPv4（IPv6 等）返回 null
 */
function ipv4ToInt(ip) {
  if (!ip) return null;
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/**
 * "1.0.1.0/24" -> { start, end }；不带前缀按单个 IP（/32）处理
 */
function cidrToRange(cidr) {
  if (!cidr) return null;

  const [ipPart, prefixPart] = String(cidr).trim().split('/');
  const start = ipv4ToInt(ipPart);
  if (start === null) return null;

  const prefix = prefixPart === undefined ? 32 : Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  return { start, end: start + 2 ** (32 - prefix) - 1 };
}

/**
 * 用查出的数据构建内存索引
 */
function buildCache(rows) {
  const ranges = [];
  const blockedCities = new Set();

  for (const row of rows) {
    const range = cidrToRange(row.IP);
    if (!range) continue;

    const name = row.IPName || '';
    ranges.push({ start: range.start, end: range.end, name });

    if (name && isOpenTrue(row.isOpen)) {
      blockedCities.add(name);
    }
  }

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  return { ranges, blockedCities };
}

/**
 * 后台刷新缓存；首次调用会等待加载完成
 */
async function refreshCache() {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const rows = await IpTableModel.getAll();
      const built = buildCache(rows);
      cache = { ...built, loadedAt: Date.now() };
      console.log(`[IP访问控制] IP段缓存已更新：${built.ranges.length} 段，${built.blockedCities.size} 个受限城市`);
      return cache;
    } catch (error) {
      console.error(`[IP访问控制] IP段缓存加载失败：${error.message}`);
      retryAt = Date.now() + RETRY_INTERVAL;
      throw error;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

async function getCache() {
  const expired = Date.now() - cache.loadedAt >= CACHE_TTL;

  if (expired && Date.now() >= retryAt) {
    if (cache.ranges.length === 0) {
      await refreshCache(); // 首次必须加载完成
    } else {
      refreshCache().catch(() => {}); // 有旧数据时后台刷新，不阻塞请求
    }
  }

  return cache;
}

/**
 * 二分查找 IP 所属段
 */
function findRange(ranges, ipInt) {
  let low = 0;
  let high = ranges.length - 1;
  let candidate = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (ranges[mid].start <= ipInt) {
      candidate = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (candidate === -1) return null;

  const range = ranges[candidate];
  return ipInt <= range.end ? range : null;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '');
}

/**
 * 从 superadmin 表加载手机号白名单（仅 type = 2 的受限地区白名单用户）
 */
async function loadSuperAdminPhones() {
  if (superAdminRefreshing) return superAdminRefreshing;

  superAdminRefreshing = (async () => {
    try {
      const phones = await UserModel.getSuperAdminPhones(2);
      superAdminCache = {
        phones: new Set(phones.map(normalizePhone).filter(Boolean)),
        loadedAt: Date.now()
      };
      console.log(`[IP访问控制] 超级管理员名单已更新：${superAdminCache.phones.size} 人`);
    } catch (error) {
      // 加载失败保留旧数据，并按 TTL 节流重试，避免每个受限请求都查库
      console.error(`[IP访问控制] 超级管理员名单加载失败：${error.message}`);
      superAdminCache = { ...superAdminCache, loadedAt: Date.now() };
    } finally {
      superAdminRefreshing = null;
    }
  })();

  return superAdminRefreshing;
}

/**
 * 获取 superadmin 手机号集合：首次等待加载，后续过期时后台刷新
 */
async function getSuperAdminPhones() {
  const expired = Date.now() - superAdminCache.loadedAt >= SUPERADMIN_CACHE_TTL;

  if (expired) {
    if (superAdminCache.loadedAt === 0) {
      await loadSuperAdminPhones();
    } else {
      loadSuperAdminPhones().catch(() => {});
    }
  }

  return superAdminCache.phones;
}

/**
 * 解析 token 中的手机号，解析失败返回空字符串
 */
function getPhoneFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return '';

  const token = String(auth).replace(/^Bearer\s+/i, '').trim();
  if (!token) return '';

  try {
    const decoded = verifyToken(token);
    return normalizePhone(decoded && decoded.phone);
  } catch (error) {
    return '';
  }
}

/**
 * 当前请求是否来自 superadmin 用户。
 * 任何异常都按普通用户处理，避免异常导致地区限制被整体绕过。
 */
async function isSuperAdminRequest(req) {
  try {
    const phone = getPhoneFromToken(req);
    if (!phone) return false;

    const phones = await getSuperAdminPhones();
    return phones.has(phone);
  } catch (error) {
    console.error(`[IP访问控制] 超级管理员校验异常：${error.message}`);
    return false;
  }
}

/**
 * 管理端新增/删除 superadmin 后调用，立即清空白名单缓存
 */
function invalidateSuperAdminCache() {
  superAdminCache = { phones: new Set(), loadedAt: 0 };
}

async function ipAccessMiddleware(req, res, next) {
  try {
    const requestPath = req.path.replace(/\/+$/, '') || '/';

    // 管理端「受限地区配置」接口不受地区限制，避免受限地区管理员无法调整配置
    // 登录/注册类接口放行，保证受限地区的超级管理员能先登录拿到 token
    if (
      requestPath === '/ip-access' ||
      requestPath.startsWith('/ip-access/') ||
      AUTH_EXEMPT_PATHS.has(requestPath)
    ) {
      return next();
    }

    const ip = getClientIp(req);
    const ipInt = ipv4ToInt(ip);

    // IPv6 / 非法 IP 直接放行（表中只有 IPv4 段）
    if (ipInt === null) return next();

    const current = await getCache();
    const match = findRange(current.ranges, ipInt);

    // 未命中任何城市段：放行
    if (!match || !match.name) return next();

    req.ipCity = match.name;

    if (current.blockedCities.has(match.name)) {
      // superadmin 表中的用户不受地区限制
      if (await isSuperAdminRequest(req)) {
        console.log(`[IP访问控制] 超级管理员放行 ${ip} (${match.name}) ${req.method} ${req.originalUrl}`);
        return next();
      }

      console.warn(`[IP访问控制] 拒绝访问 ${ip} (${match.name}) ${req.method} ${req.originalUrl}`);
      return next(new IpForbiddenError(match.name));
    }

    next();
  } catch (error) {
    // 访问控制自身故障时放行，并记录错误
    console.error('[IP访问控制] 检查异常，放行请求:', error.message);
    next();
  }
}

module.exports = {
  ipAccessMiddleware,
  IpForbiddenError,
  refreshCache,
  invalidateSuperAdminCache
};
