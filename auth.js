// Simple, dependency-free auth: scrypt password hashing + signed session cookies.
// No bcrypt/jsonwebtoken needed (avoids native compilation issues like better-sqlite3 had).
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-in-railway';
const SESSION_COOKIE_NAME = 'ph_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Password hashing (scrypt, built into Node's crypto — no native deps) ──────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// ── Session tokens (HMAC-signed, stateless — no server-side session store needed) ──
function createSessionToken(discordId) {
  const payload = JSON.stringify({ discordId, exp: Date.now() + SESSION_MAX_AGE_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null; // expired
    return payload; // { discordId, exp }
  } catch {
    return null;
  }
}

// ── Express middleware ─────────────────────────────────────────────────────────
function attachUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const session = token ? verifySessionToken(token) : null;
  req.user = session ? { discordId: session.discordId } : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  next();
}

function setSessionCookie(res, discordId) {
  const token = createSessionToken(discordId);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME);
}

module.exports = {
  hashPassword,
  verifyPassword,
  attachUser,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
};
