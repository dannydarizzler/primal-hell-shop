// Simple shared-password gate for the in-shop Admin Panel (sales management).
// Separate from user accounts and from the bot's x-bot-secret — this is just a
// lightweight "only staff with the password can see this" gate.
const crypto = require('crypto');

const ADMIN_PANEL_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || 'dm7op';
const ADMIN_PANEL_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-in-railway';
const ADMIN_PANEL_COOKIE = 'ph_admin_panel';
const ADMIN_PANEL_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function createAdminPanelToken() {
  const payload = JSON.stringify({ exp: Date.now() + ADMIN_PANEL_MAX_AGE_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_PANEL_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifyAdminPanelToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payloadB64, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', ADMIN_PANEL_SECRET).update(payloadB64).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload.exp >= Date.now();
  } catch {
    return false;
  }
}

function checkPassword(password) {
  if (!password || password.length !== ADMIN_PANEL_PASSWORD.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PANEL_PASSWORD));
}

function setAdminPanelCookie(res) {
  const token = createAdminPanelToken();
  res.cookie(ADMIN_PANEL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_PANEL_MAX_AGE_MS,
  });
}

function requireAdminPanel(req, res, next) {
  const token = req.cookies?.[ADMIN_PANEL_COOKIE];
  if (!verifyAdminPanelToken(token)) {
    return res.status(401).json({ error: 'Admin panel login required.' });
  }
  next();
}

module.exports = { checkPassword, setAdminPanelCookie, requireAdminPanel, verifyAdminPanelToken, ADMIN_PANEL_COOKIE };
