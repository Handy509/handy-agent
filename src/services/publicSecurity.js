const crypto = require("node:crypto");

const buckets = new Map();

function makeOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySessionToken(session, token) {
  return Boolean(session?.tokenHash && safeEqual(session.tokenHash, hashToken(token)));
}

function clientAddress(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function rateLimit({ namespace, limit, windowMs }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${namespace}:${clientAddress(req)}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }

    if (buckets.size > 5000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    return next();
  };
}

module.exports = {
  hashToken,
  makeOpaqueToken,
  rateLimit,
  safeEqual,
  verifySessionToken
};
