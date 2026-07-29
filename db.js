const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'shop.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

const SIGNUP_BONUS_COINS = 200;

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
    is_sandbox INTEGER NOT NULL DEFAULT 0,
    processed_by_bot INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Migration: purchases may already exist without is_sandbox ─────────────────
{
  const purchaseColumns = db.prepare(`PRAGMA table_info(purchases)`).all().map((c) => c.name);
  if (!purchaseColumns.includes('is_sandbox')) {
    db.exec(`ALTER TABLE purchases ADD COLUMN is_sandbox INTEGER NOT NULL DEFAULT 0`);
  }
}

// ── Coin balances ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS balances (
    discord_id TEXT PRIMARY KEY,
    coins INTEGER NOT NULL DEFAULT 0
  )
`);

// ── Promo codes (two types: "bonus" = % extra on top-up, "reward" = flat Coins
// redeemable directly without any purchase) ─────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'bonus',
    bonus_percent INTEGER,
    reward_coins INTEGER,
    expires_at TEXT,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Tracks which users already redeemed a "reward" code (one redemption per user) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS promo_redemptions (
    code TEXT NOT NULL,
    discord_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    notified_by_bot INTEGER NOT NULL DEFAULT 0,
    redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (code, discord_id)
  )
`);

// ── Migration: promo_redemptions may already exist without these columns ──────
{
  const redemptionColumns = db.prepare(`PRAGMA table_info(promo_redemptions)`).all().map((c) => c.name);
  if (!redemptionColumns.includes('amount')) {
    db.exec(`ALTER TABLE promo_redemptions ADD COLUMN amount INTEGER NOT NULL DEFAULT 0`);
  }
  if (!redemptionColumns.includes('notified_by_bot')) {
    db.exec(`ALTER TABLE promo_redemptions ADD COLUMN notified_by_bot INTEGER NOT NULL DEFAULT 0`);
  }
}

// ── Migration: promo_codes may be missing the new columns, OR (older deploys)
// have bonus_percent as NOT NULL from before "reward" codes existed — which
// would crash any reward-code insert (bonus_percent is null for those). Rebuild
// the table with a corrected schema whenever that legacy constraint is found. ──
{
  const promoInfo = db.prepare(`PRAGMA table_info(promo_codes)`).all();
  const columnNames = promoInfo.map((c) => c.name);
  const bonusCol = promoInfo.find((c) => c.name === 'bonus_percent');
  const needsRebuild = bonusCol && bonusCol.notnull === 1;

  if (needsRebuild) {
    const hasType = columnNames.includes('type');
    const hasReward = columnNames.includes('reward_coins');

    db.exec(`
      CREATE TABLE promo_codes_new (
        code TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'bonus',
        bonus_percent INTEGER,
        reward_coins INTEGER,
        expires_at TEXT,
        max_uses INTEGER,
        uses_count INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      INSERT INTO promo_codes_new (code, type, bonus_percent, reward_coins, expires_at, max_uses, uses_count, created_by, created_at)
      SELECT code, ${hasType ? 'type' : "'bonus'"}, bonus_percent, ${hasReward ? 'reward_coins' : 'NULL'}, expires_at, max_uses, uses_count, created_by, created_at
      FROM promo_codes
    `);
    db.exec(`DROP TABLE promo_codes`);
    db.exec(`ALTER TABLE promo_codes_new RENAME TO promo_codes`);
  } else {
    if (!columnNames.includes('type')) {
      db.exec(`ALTER TABLE promo_codes ADD COLUMN type TEXT NOT NULL DEFAULT 'bonus'`);
    }
    if (!columnNames.includes('reward_coins')) {
      db.exec(`ALTER TABLE promo_codes ADD COLUMN reward_coins INTEGER`);
    }
  }
}

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
    display_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Migration: users table may already exist without display_name / is_vip ────
{
  const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name);
  if (!userColumns.includes('display_name')) {
    db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!userColumns.includes('is_vip')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_vip INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userColumns.includes('exclude_from_analytics')) {
    db.exec(`ALTER TABLE users ADD COLUMN exclude_from_analytics INTEGER NOT NULL DEFAULT 0`);
  }
  if (!userColumns.includes('signup_bonus_claimed')) {
    db.exec(`ALTER TABLE users ADD COLUMN signup_bonus_claimed INTEGER NOT NULL DEFAULT 0`);
    // One-time backfill: existing accounts predate this feature and shouldn't
    // retroactively get a free 200 Coins — only new signups from here on should.
    db.exec(`UPDATE users SET signup_bonus_claimed = 1`);
  }
}

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
function createPendingPurchase({ paypalOrderId, discordId, packageId, priceEur, coins, promoCode, bonusPercent, isSandbox }) {
  const stmt = db.prepare(`
    INSERT INTO purchases (paypal_order_id, discord_id, package_id, price_eur, coins, status, promo_code, bonus_percent, is_sandbox)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `);
  stmt.run(paypalOrderId, discordId, packageId, priceEur, coins, promoCode || null, bonusPercent || 0, isSandbox ? 1 : 0);
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
function createPromoCode({ code, type, bonusPercent, rewardCoins, expiresAt, maxUses, createdBy }) {
  const normalized = code.trim().toUpperCase();
  db.prepare(`
    INSERT INTO promo_codes (code, type, bonus_percent, reward_coins, expires_at, max_uses, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(normalized, type, bonusPercent || null, rewardCoins || null, expiresAt || null, maxUses || null, createdBy || 'unknown');
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

function deletePromoCode(code) {
  const normalized = code.trim().toUpperCase();
  const result = db.prepare(`DELETE FROM promo_codes WHERE code = ?`).run(normalized);
  return result.changes > 0;
}

function deleteInactivePromoCodes() {
  const nowIso = new Date().toISOString();
  const result = db.prepare(`
    DELETE FROM promo_codes
    WHERE (expires_at IS NOT NULL AND expires_at < ?)
       OR (max_uses IS NOT NULL AND uses_count >= max_uses)
  `).run(nowIso);
  return result.changes;
}

function hasUserRedeemed(code, discordId) {
  const row = db.prepare(`SELECT 1 FROM promo_redemptions WHERE code = ? AND discord_id = ?`).get(code.trim().toUpperCase(), discordId);
  return !!row;
}

/** Redeems a flat-reward code for a user: credits coins, records the redemption,
 * and bumps the usage counter — all atomically. Returns the new balance. */
function redeemPromoForUser(code, discordId, rewardCoins) {
  const normalized = code.trim().toUpperCase();
  let newBalance;
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO promo_redemptions (code, discord_id, amount) VALUES (?, ?, ?)`).run(normalized, discordId, rewardCoins);
    db.prepare(`UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = ?`).run(normalized);
    db.prepare(`
      INSERT INTO balances (discord_id, coins) VALUES (?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET coins = coins + excluded.coins
    `).run(discordId, rewardCoins);
    db.exec('COMMIT');
    newBalance = getBalance(discordId);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return newBalance;
}

// ── Bot sync for reward-code redemption DMs ─────────────────────────────────────
function getUnnotifiedRedemptions() {
  return db.prepare(`SELECT rowid AS id, code, discord_id, amount FROM promo_redemptions WHERE notified_by_bot = 0`).all();
}

function markRedemptionNotified(id) {
  db.prepare(`UPDATE promo_redemptions SET notified_by_bot = 1 WHERE rowid = ?`).run(id);
}

// ── Discord activity tier progress (message count, pushed from the bot) ────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tier_progress (
    discord_id TEXT PRIMARY KEY,
    message_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Migration: tier_progress needs a Discord display name for the public
// leaderboard — most active members won't have a shop account/display_name,
// so the bot pushes their live Discord name alongside the message count.
{
  const tierProgressColumns = db.prepare(`PRAGMA table_info(tier_progress)`).all().map((c) => c.name);
  if (!tierProgressColumns.includes('discord_name')) {
    db.exec(`ALTER TABLE tier_progress ADD COLUMN discord_name TEXT`);
  }
}

function setTierProgress(discordId, messageCount, discordName) {
  db.prepare(`
    INSERT INTO tier_progress (discord_id, message_count, discord_name, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(discord_id) DO UPDATE SET
      message_count = excluded.message_count,
      discord_name = COALESCE(excluded.discord_name, tier_progress.discord_name),
      updated_at = CURRENT_TIMESTAMP
  `).run(discordId, messageCount, discordName || null);

  // Display names are no longer player-editable — whenever the bot pushes a
  // live Discord name, keep the shop account's display_name in sync with it
  // automatically (only if that person already has a shop account).
  if (discordName) {
    db.prepare(`UPDATE users SET display_name = ? WHERE discord_id = ?`).run(discordName, discordId);
  }
}

function getTierProgress(discordId) {
  const row = db.prepare(`SELECT message_count FROM tier_progress WHERE discord_id = ?`).get(discordId);
  return row ? row.message_count : 0;
}

/** Looks up the most recent Discord name the bot has pushed for this ID —
 * used to auto-fill the display name at registration time, before a users
 * row (and therefore a display_name) even exists yet. */
function getCachedDiscordName(discordId) {
  const row = db.prepare(`SELECT discord_name FROM tier_progress WHERE discord_id = ?`).get(discordId);
  return row ? row.discord_name : null;
}

/** Top-N most active members by message count, for the public leaderboard.
 * Excludes admin/test accounts flagged via exclude_from_analytics. Prefers the
 * player's shop display_name if they have an account, else the bot-pushed
 * Discord name, else falls back to a masked ID. */
function getTopTierProgress(limit = 5) {
  return db.prepare(`
    SELECT tp.discord_id, tp.message_count,
           COALESCE(NULLIF(u.display_name, ''), tp.discord_name) AS display_name
    FROM tier_progress tp
    LEFT JOIN users u ON u.discord_id = tp.discord_id
    WHERE tp.message_count > 0
      AND (u.exclude_from_analytics IS NULL OR u.exclude_from_analytics = 0)
    ORDER BY tp.message_count DESC
    LIMIT ?
  `).all(limit);
}

// ── Shop-wide announcement popup (admin-controlled) ─────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS announcement (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    message TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
db.prepare(`INSERT OR IGNORE INTO announcement (id, message, active) VALUES (1, '', 0)`).run();

function getAnnouncement() {
  return db.prepare(`SELECT message, active FROM announcement WHERE id = 1`).get();
}

function setAnnouncement(message, active) {
  db.prepare(`
    UPDATE announcement SET message = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
  `).run(message, active ? 1 : 0);
}

// ── Sales (admin-controlled discounts on catalog items, chests, packages, combos) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    discount_percent INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_type, item_id)
  )
`);

function setSale(itemType, itemId, discountPercent) {
  db.prepare(`
    INSERT INTO sales (item_type, item_id, discount_percent, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(item_type, item_id) DO UPDATE SET discount_percent = excluded.discount_percent, updated_at = CURRENT_TIMESTAMP
  `).run(itemType, itemId, discountPercent);
}

function removeSale(itemType, itemId) {
  db.prepare(`DELETE FROM sales WHERE item_type = ? AND item_id = ?`).run(itemType, itemId);
}

function getSale(itemType, itemId) {
  const row = db.prepare(`SELECT discount_percent FROM sales WHERE item_type = ? AND item_id = ?`).get(itemType, itemId);
  return row ? row.discount_percent : 0;
}

function getAllSales() {
  return db.prepare(`SELECT * FROM sales ORDER BY updated_at DESC`).all();
}

// ── Daily Lucky Wheel — one spin per user per 24h ──────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_spins (
    discord_id TEXT PRIMARY KEY,
    last_spin_at TEXT NOT NULL,
    total_spins INTEGER NOT NULL DEFAULT 0
  )
`);

// ── VIP Lucky Wheel — separate 24h cooldown, VIP members only ──────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS vip_daily_spins (
    discord_id TEXT PRIMARY KEY,
    last_spin_at TEXT NOT NULL,
    total_spins INTEGER NOT NULL DEFAULT 0
  )
`);

// ── Log of individual spins (so the bot can DM "Congrats, you won X!" once per spin) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS spin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    jackpot INTEGER NOT NULL DEFAULT 0,
    spun_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_by_bot INTEGER NOT NULL DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vip_spin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    jackpot INTEGER NOT NULL DEFAULT 0,
    spun_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_by_bot INTEGER NOT NULL DEFAULT 0
  )
`);

// ── User accounts ────────────────────────────────────────────────────────────────
const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Creates a full set of Lucky-Wheel functions bound to a given pair of tables,
 * so the standard wheel and the VIP wheel can share the exact same logic
 * without duplicating it. Table names are fixed internal literals (never user
 * input), so simple string interpolation into SQL here is safe. */
function createSpinModule(spinsTable, historyTable) {
  function getSpinStatus(discordId) {
    const row = db.prepare(`SELECT last_spin_at FROM ${spinsTable} WHERE discord_id = ?`).get(discordId);
    if (!row) return { canSpin: true, nextSpinAt: null };
    const nextSpinAt = new Date(new Date(row.last_spin_at).getTime() + SPIN_COOLDOWN_MS);
    return { canSpin: Date.now() >= nextSpinAt.getTime(), nextSpinAt: nextSpinAt.toISOString() };
  }

  function trySpin(discordId, amount, jackpot) {
    const existing = db.prepare(`SELECT last_spin_at FROM ${spinsTable} WHERE discord_id = ?`).get(discordId);
    const now = new Date();

    if (existing) {
      const elapsed = now.getTime() - new Date(existing.last_spin_at).getTime();
      if (elapsed < SPIN_COOLDOWN_MS) return null; // still on cooldown
    }

    const nowIso = now.toISOString();
    db.exec('BEGIN');
    try {
      if (existing) {
        db.prepare(`UPDATE ${spinsTable} SET last_spin_at = ?, total_spins = total_spins + 1 WHERE discord_id = ?`).run(nowIso, discordId);
      } else {
        db.prepare(`INSERT INTO ${spinsTable} (discord_id, last_spin_at, total_spins) VALUES (?, ?, 1)`).run(discordId, nowIso);
      }
      db.prepare(`
        INSERT INTO balances (discord_id, coins) VALUES (?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET coins = coins + excluded.coins
      `).run(discordId, amount);
      db.prepare(`INSERT INTO ${historyTable} (discord_id, amount, jackpot) VALUES (?, ?, ?)`).run(discordId, amount, jackpot ? 1 : 0);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return {
      newBalance: getBalance(discordId),
      nextSpinAt: new Date(now.getTime() + SPIN_COOLDOWN_MS).toISOString(),
    };
  }

  function getUnnotifiedSpins() {
    return db.prepare(`SELECT * FROM ${historyTable} WHERE notified_by_bot = 0`).all();
  }

  function markSpinNotified(id) {
    db.prepare(`UPDATE ${historyTable} SET notified_by_bot = 1 WHERE id = ?`).run(id);
  }

  return { getSpinStatus, trySpin, getUnnotifiedSpins, markSpinNotified };
}

const standardSpin = createSpinModule('daily_spins', 'spin_history');
const vipSpin = createSpinModule('vip_daily_spins', 'vip_spin_history');

const getSpinStatus = standardSpin.getSpinStatus;
const trySpin = standardSpin.trySpin;
const getUnnotifiedSpins = standardSpin.getUnnotifiedSpins;
const markSpinNotified = standardSpin.markSpinNotified;

const getVipSpinStatus = vipSpin.getSpinStatus;
const tryVipSpin = vipSpin.trySpin;
const getUnnotifiedVipSpins = vipSpin.getUnnotifiedSpins;
const markVipSpinNotified = vipSpin.markSpinNotified;

// ── VIP flag management ─────────────────────────────────────────────────────────
function setVip(discordId, isVip) {
  db.prepare(`UPDATE users SET is_vip = ? WHERE discord_id = ?`).run(isVip ? 1 : 0, discordId);
}

function isVip(discordId) {
  const row = db.prepare(`SELECT is_vip FROM users WHERE discord_id = ?`).get(discordId);
  return !!(row && row.is_vip);
}

function createUser(discordId, passwordHash, displayName) {
  db.prepare(`INSERT INTO users (discord_id, password_hash, display_name) VALUES (?, ?, ?)`).run(discordId, passwordHash, displayName);
  // Ensure a balance row exists so getBalance/addCoins behave consistently from the start
  db.prepare(`INSERT OR IGNORE INTO balances (discord_id, coins) VALUES (?, 0)`).run(discordId);
}

function getUser(discordId) {
  return db.prepare(`SELECT * FROM users WHERE discord_id = ?`).get(discordId);
}

function getAllAccounts() {
  return db.prepare(`
    SELECT u.discord_id, u.display_name, u.is_vip, u.created_at, u.exclude_from_analytics,
           COALESCE(b.coins, 0) AS coins
    FROM users u
    LEFT JOIN balances b ON b.discord_id = u.discord_id
    ORDER BY b.coins DESC
  `).all();
}

function setExcludeFromAnalytics(discordId, excluded) {
  db.prepare(`UPDATE users SET exclude_from_analytics = ? WHERE discord_id = ?`).run(excluded ? 1 : 0, discordId);
}

// ── Analytics: revenue (LIVE payments only — sandbox test payments AND
// admin-excluded test accounts are left out) ────────────────────────────────
function getRevenueAnalytics() {
  const rows = db.prepare(`
    SELECT p.discord_id, u.display_name, SUM(p.price_eur) AS total_eur, COUNT(*) AS purchase_count
    FROM purchases p
    LEFT JOIN users u ON u.discord_id = p.discord_id
    WHERE p.status = 'completed' AND p.is_sandbox = 0
      AND (u.exclude_from_analytics IS NULL OR u.exclude_from_analytics = 0)
    GROUP BY p.discord_id
    ORDER BY total_eur DESC
  `).all();
  const totalEur = rows.reduce((sum, r) => sum + r.total_eur, 0);
  const totalPurchases = rows.reduce((sum, r) => sum + r.purchase_count, 0);
  return { rows, totalEur, totalPurchases };
}

// ── Analytics: economy health + most popular items ────────────────────────────
function getEconomyStats() {
  const totalCoins = db.prepare(`SELECT COALESCE(SUM(coins), 0) AS total FROM balances`).get().total;
  const totalAccounts = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
  const payingAccounts = db.prepare(`
    SELECT COUNT(DISTINCT p.discord_id) AS c
    FROM purchases p
    LEFT JOIN users u ON u.discord_id = p.discord_id
    WHERE p.status = 'completed' AND p.is_sandbox = 0
      AND (u.exclude_from_analytics IS NULL OR u.exclude_from_analytics = 0)
  `).get().c;
  const topItems = db.prepare(`
    SELECT co.item_won, COUNT(*) AS cnt
    FROM chest_openings co
    LEFT JOIN users u ON u.discord_id = co.discord_id
    WHERE (u.exclude_from_analytics IS NULL OR u.exclude_from_analytics = 0)
    GROUP BY co.item_won
    ORDER BY cnt DESC
    LIMIT 8
  `).all();
  return { totalCoins, totalAccounts, payingAccounts, topItems };
}

function updateDisplayName(discordId, name) {
  db.prepare(`UPDATE users SET display_name = ? WHERE discord_id = ?`).run(name, discordId);
}

/** Claims the one-time 200-Coin signup bonus. Returns { ok: true, newBalance }
 * or { ok: false, reason } if already claimed / no such account. Atomic so it
 * can't be double-claimed by a double-click or a retried request. */
function claimSignupBonus(discordId) {
  let newBalance;
  db.exec('BEGIN');
  try {
    const result = db.prepare(`
      UPDATE users SET signup_bonus_claimed = 1
      WHERE discord_id = ? AND signup_bonus_claimed = 0
    `).run(discordId);

    if (result.changes === 0) {
      db.exec('ROLLBACK');
      return { ok: false, reason: db.prepare(`SELECT 1 FROM users WHERE discord_id = ?`).get(discordId)
        ? 'This bonus has already been claimed.'
        : 'No account found.' };
    }

    db.prepare(`
      INSERT INTO balances (discord_id, coins) VALUES (?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET coins = coins + excluded.coins
    `).run(discordId, SIGNUP_BONUS_COINS);
    db.exec('COMMIT');
    newBalance = getBalance(discordId);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { ok: true, newBalance };
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

// ── Admin: fix a mistyped Discord ID ────────────────────────────────────────────
// Moves EVERYTHING (balance, purchases, items, promo redemptions, spins) from an
// old (wrongly entered) Discord ID to the correct one, in a single transaction.
function migrateDiscordId(oldId, newId) {
  const oldUser = db.prepare(`SELECT * FROM users WHERE discord_id = ?`).get(oldId);
  if (!oldUser) return { ok: false, error: `No account found with Discord ID ${oldId}.` };

  const clash = db.prepare(`SELECT 1 FROM users WHERE discord_id = ?`).get(newId);
  if (clash) return { ok: false, error: `An account already exists with Discord ID ${newId}. Refusing to overwrite it.` };

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE users SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE balances SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE purchases SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE chest_openings SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE promo_redemptions SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE daily_spins SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.prepare(`UPDATE spin_history SET discord_id = ? WHERE discord_id = ?`).run(newId, oldId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { ok: true, newBalance: getBalance(newId) };
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
  getAllAccounts,
  setExcludeFromAnalytics,
  getRevenueAnalytics,
  getEconomyStats,
  updateDisplayName,
  claimSignupBonus,
  getSpinStatus,
  trySpin,
  getUnnotifiedSpins,
  markSpinNotified,
  getVipSpinStatus,
  tryVipSpin,
  getUnnotifiedVipSpins,
  markVipSpinNotified,
  setVip,
  isVip,
  setSale,
  removeSale,
  getSale,
  getAllSales,
  getAnnouncement,
  setAnnouncement,
  setTierProgress,
  getTierProgress,
  getCachedDiscordName,
  getTopTierProgress,
  migrateDiscordId,
  createPromoCode,
  getPromoCode,
  validatePromoCode,
  incrementPromoUse,
  getAllPromoCodes,
  deletePromoCode,
  deleteInactivePromoCodes,
  hasUserRedeemed,
  redeemPromoForUser,
  getUnnotifiedRedemptions,
  markRedemptionNotified,
  logChestOpening,
  logShopPurchase,
  getChestHistory,
  getItemsForUser,
  getItemById,
  redeemItem,
};
