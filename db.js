const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'shop.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

// ── Purchases (PayPal top-ups) ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paypal_order_id TEXT UNIQUE NOT NULL,
    discord_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    price_eur REAL NOT NULL,
    coins INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    processed_by_bot INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Coin balances ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS balances (
    discord_id TEXT PRIMARY KEY,
    coins INTEGER NOT NULL DEFAULT 0
  )
`);

// ── Promo codes (e.g. "BONUS20" = +20% coins on top-up) ────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    bonus_percent INTEGER NOT NULL,
    expires_at TEXT,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Migration: purchases table needs to remember which promo (if any) applied ─
{
  const purchaseColumns = db.prepare(`PRAGMA table_info(purchases)`).all().map((c) => c.name);
  if (!purchaseColumns.includes('promo_code')) {
    db.exec(`ALTER TABLE purchases ADD COLUMN promo_code TEXT`);
  }
  if (!purchaseColumns.includes('bonus_percent')) {
    db.exec(`ALTER TABLE purchases ADD COLUMN bonus_percent INTEGER NOT NULL DEFAULT 0`);
  }
}
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Chest opening history ───────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chest_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    cost INTEGER NOT NULL,
    item_won TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    redeemed_by TEXT,
    redeemed_at TEXT,
    opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Purchases ────────────────────────────────────────────────────────────────────
function createPendingPurchase({ paypalOrderId, discordId, packageId, priceEur, coins, promoCode, bonusPercent }) {
  const stmt = db.prepare(`
    INSERT INTO purchases (paypal_order_id, discord_id, package_id, price_eur, coins, status, promo_code, bonus_percent)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `);
  stmt.run(paypalOrderId, discordId, packageId, priceEur, coins, promoCode || null, bonusPercent || 0);
}

function markPurchaseCompleted(paypalOrderId) {
  const purchase = db.prepare(`SELECT * FROM purchases WHERE paypal_order_id = ?`).get(paypalOrderId);
  if (!purchase) return null;
  if (purchase.status === 'completed') return purchase;

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE purchases SET status = 'completed' WHERE paypal_order_id = ?`).run(paypalOrderId);
    db.prepare(`
      INSERT INTO balances (discord_id, coins) VALUES (?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET coins = coins + excluded.coins
    `).run(purchase.discord_id, purchase.coins);
    if (purchase.promo_code) {
      db.prepare(`UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?`).run(purchase.promo_code);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return db.prepare(`SELECT * FROM purchases WHERE paypal_order_id = ?`).get(paypalOrderId);
}

// ── Balances ─────────────────────────────────────────────────────────────────────
function getBalance(discordId) {
  const row = db.prepare(`SELECT coins FROM balances WHERE discord_id = ?`).get(discordId);
  return row ? row.coins : 0;
}

function addCoins(discordId, amount) {
  db.prepare(`
    INSERT INTO balances (discord_id, coins) VALUES (?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET coins = coins + excluded.coins
  `).run(discordId, amount);
  return getBalance(discordId);
}

/** Atomically spends coins if the user has enough. Returns new balance, or null if insufficient funds. */
function spendCoins(discordId, amount) {
  const current = getBalance(discordId);
  if (current < amount) return null;

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE balances SET coins = coins - ? WHERE discord_id = ?`).run(amount, discordId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getBalance(discordId);
}

// ── Bot sync ─────────────────────────────────────────────────────────────────────
function getUnprocessedPurchases() {
  return db.prepare(`SELECT * FROM purchases WHERE status = 'completed' AND processed_by_bot = 0`).all();
}

function markProcessedByBot(id) {
  db.prepare(`UPDATE purchases SET processed_by_bot = 1 WHERE id = ?`).run(id);
}

// ── Promo codes ──────────────────────────────────────────────────────────────────
function createPromoCode(code, bonusPercent, expiresAt, maxUses, createdBy) {
  const normalized = code.trim().toUpperCase();
  db.prepare(`
    INSERT INTO promo_codes (code, bonus_percent, expires_at, max_uses, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(normalized, bonusPercent, expiresAt || null, maxUses || null, createdBy || 'unknown');
  return normalized;
}

function getPromoCode(code) {
  return db.prepare(`SELECT * FROM promo_codes WHERE code = ?`).get(code.trim().toUpperCase());
}

/** Returns { valid: true, promo } or { valid: false, reason }. Never throws. */
function validatePromoCode(code) {
  const promo = getPromoCode(code);
  if (!promo) return { valid: false, reason: 'This code does not exist.' };
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'This code has expired.' };
  }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return { valid: false, reason: 'This code has reached its usage limit.' };
  }
  return { valid: true, promo };
}

function incrementPromoUse(code) {
  db.prepare(`UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?`).run(code.trim().toUpperCase());
}

function getAllPromoCodes() {
  return db.prepare(`SELECT * FROM promo_codes ORDER BY created_at DESC`).all();
}

// ── User accounts ────────────────────────────────────────────────────────────────
function createUser(discordId, passwordHash) {
  db.prepare(`INSERT INTO users (discord_id, password_hash) VALUES (?, ?)`).run(discordId, passwordHash);
  // Ensure a balance row exists so getBalance/addCoins behave consistently from the start
  db.prepare(`INSERT OR IGNORE INTO balances (discord_id, coins) VALUES (?, 0)`).run(discordId);
}

function getUser(discordId) {
  return db.prepare(`SELECT * FROM users WHERE discord_id = ?`).get(discordId);
}

// ── Chest openings ───────────────────────────────────────────────────────────────
// ── Migration: add columns if this table already existed without them ─────────
// (needed because the shop is already deployed — CREATE TABLE IF NOT EXISTS
// above won't retroactively add columns to an existing table)
{
  const existingColumns = db.prepare(`PRAGMA table_info(chest_openings)`).all().map((c) => c.name);
  if (!existingColumns.includes('status')) {
    db.exec(`ALTER TABLE chest_openings ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  }
  if (!existingColumns.includes('redeemed_by')) {
    db.exec(`ALTER TABLE chest_openings ADD COLUMN redeemed_by TEXT`);
  }
  if (!existingColumns.includes('redeemed_at')) {
    db.exec(`ALTER TABLE chest_openings ADD COLUMN redeemed_at TEXT`);
  }
  if (!existingColumns.includes('source')) {
    db.exec(`ALTER TABLE chest_openings ADD COLUMN source TEXT NOT NULL DEFAULT 'chest'`);
  }
}

function logChestOpening(discordId, tier, cost, itemWon) {
  db.prepare(`
    INSERT INTO chest_openings (discord_id, tier, cost, item_won, source) VALUES (?, ?, ?, ?, 'chest')
  `).run(discordId, tier, cost, itemWon);
}

/** Direct (non-random, fixed-price) shop catalog purchase — logged the same way so
 * it shows up in "My Items" and the admin /check-items and /redeem-item commands. */
function logShopPurchase(discordId, categoryId, cost, itemWon) {
  db.prepare(`
    INSERT INTO chest_openings (discord_id, tier, cost, item_won, source) VALUES (?, ?, ?, ?, 'shop')
  `).run(discordId, categoryId, cost, itemWon);
}

function getChestHistory(discordId, limit = 20) {
  return db.prepare(`
    SELECT tier, cost, item_won, opened_at FROM chest_openings
    WHERE discord_id = ? ORDER BY opened_at DESC LIMIT ?
  `).all(discordId, limit);
}

/** Full item list for a player (used by both the "My Items" web tab and the Discord admin check). */
function getItemsForUser(discordId, limit = 100) {
  return db.prepare(`
    SELECT id, tier, cost, item_won, status, source, redeemed_by, redeemed_at, opened_at
    FROM chest_openings WHERE discord_id = ? ORDER BY opened_at DESC LIMIT ?
  `).all(discordId, limit);
}

function getItemById(id) {
  return db.prepare(`SELECT * FROM chest_openings WHERE id = ?`).get(id);
}

/** Marks an item as redeemed. Returns the updated item, or null if not found / already redeemed. */
function redeemItem(id, adminDiscordId) {
  const item = getItemById(id);
  if (!item) return null;
  if (item.status === 'redeemed') return item; // idempotent — already done

  db.prepare(`
    UPDATE chest_openings SET status = 'redeemed', redeemed_by = ?, redeemed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(adminDiscordId, id);

  return getItemById(id);
}

module.exports = {
  db,
  createPendingPurchase,
  markPurchaseCompleted,
  getBalance,
  addCoins,
  spendCoins,
  getUnprocessedPurchases,
  markProcessedByBot,
  createUser,
  getUser,
  createPromoCode,
  getPromoCode,
  validatePromoCode,
  incrementPromoUse,
  getAllPromoCodes,
  logChestOpening,
  logShopPurchase,
  getChestHistory,
  getItemsForUser,
  getItemById,
  redeemItem,
};
