const net = require('net');

/**
 * 客户端 IP 解析中间件（网关最外层使用）
 *
 * 挂载位置：app.js 中第一个中间件，早于路由与业务逻辑。
 * 解析结果写入 req.clientIp，后续 controller 直接读取即可。
 *
 * 解析策略：
 * 1. 来源直连（对端不在受信代理范围内）时，只认 TCP 连接地址，忽略代理头，防止伪造；
 * 2. 经过受信代理时，优先使用 Express 按 trust proxy 逐跳解析出的 req.ip；
 * 3. 兜底支持只设置 X-Real-IP / X-Forwarded-For 的反向代理。
 */

/**
 * 解析 TRUST_PROXY 环境变量，交给 Express 编译成可信代理判定函数
 * - false / "false"：直连部署，不信任任何代理头
 * - true / "true"：信任所有代理（仅限内网或应用前面没有不可信网络时）
 * - 数字：信任的代理跳数
 * - 字符串：逗号分隔的 IP / CIDR / 预设名（loopback、linklocal、uniquelocal）
 */
function parseTrustProxy(value) {
  if (value === undefined || value === null || value === '') {
    // 默认值覆盖常见部署：同机 nginx、内网 / Docker 网段内的代理
    return 'loopback, linklocal, uniquelocal';
  }

  const raw = String(value).trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

/**
 * 取出请求头的第一个值（Node 对部分重复头可能解析成数组）
 */
function firstHeader(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 规范化 IP：去掉端口、方括号、IPv4 映射的 IPv6 前缀，取第一个值
 */
function normalizeIp(raw) {
  if (raw === undefined || raw === null) return '';

  let ip = String(raw).trim();
  if (!ip) return '';

  // X-Forwarded-For 可能是 "client, proxy1, proxy2"，取最左端
  ip = ip.split(',')[0].trim();

  // [IPv6]:port
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];

  // IPv4:port
  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) ip = ipv4WithPort[1];

  // ::ffff:192.168.1.1 -> 192.168.1.1
  if (/^::ffff:/i.test(ip)) {
    const mapped = ip.slice(7);
    if (net.isIP(mapped) === 4) ip = mapped;
  }

  return ip;
}

/**
 * 判断 TCP 对端是否属于受信任代理
 * Express 在 app.set('trust proxy', ...) 时会额外生成 'trust proxy fn'
 */
function isTrustedPeer(req, socketIp) {
  const trustFn = req.app.get('trust proxy fn');
  if (typeof trustFn !== 'function' || !socketIp) return false;
  return trustFn(socketIp, 0);
}

/**
 * 解析真实客户端 IP
 */
function resolveClientIp(req) {
  const socketIp = normalizeIp(req.socket?.remoteAddress || req.connection?.remoteAddress);
  const expressIp = normalizeIp(req.ip);

  // 直连或对端不可信：不接受任何代理头，避免被伪造
  if (!isTrustedPeer(req, socketIp)) {
    return expressIp || socketIp;
  }

  // 请求经过受信代理：Express 已按 trust proxy 配置逐跳解析，结果最可信
  if (expressIp && expressIp !== socketIp) {
    return expressIp;
  }

  // 兜底：代理只设置了 X-Real-IP，没有 X-Forwarded-For
  const realIp = normalizeIp(firstHeader(req, 'x-real-ip'));
  if (realIp) return realIp;

  const forwardedIp = normalizeIp(firstHeader(req, 'x-forwarded-for'));
  if (forwardedIp) return forwardedIp;

  return socketIp || expressIp;
}

/**
 * 中间件：把客户端 IP 挂到 req.clientIp
 */
function clientIpMiddleware(req, res, next) {
  req.clientIp = resolveClientIp(req);
  // 打印到控制台，便于排查来源
  console.log(`[客户端IP] ${req.clientIp} ${req.method} ${req.originalUrl}`);
  next();
}

/**
 * 供业务代码复用的读取方法
 */
function getClientIp(req) {
  return req.clientIp || resolveClientIp(req);
}

module.exports = {
  clientIpMiddleware,
  getClientIp,
  resolveClientIp,
  parseTrustProxy,
  normalizeIp
};
