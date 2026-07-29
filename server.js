require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { PACKAGES } = require('./packages');
const { CHESTS, drawFromChest } = require('./chests');
const { CATALOG, findTier } = require('./catalog');
const { SPIN_SEGMENTS, drawSpinSegmentIndex } = require('./spinwheel');
const { VIP_SPIN_SEGMENTS, drawVipSpinSegmentIndex } = require('./vipspinwheel');
const { COMBO_PACKS, findCombo } = require('./combopacks');
const { computeTierProgress, getPublicTierProgress } = require('./tierprogress');
const paypal = require('./paypal');
const db = require('./db');
const auth = require('./auth');
const adminPanel = require('./adminpanel');
const discordapi = require('./discordapi');

// ── Live visitor tracking (ephemeral, in-memory only — never written to disk,
// never shared with anyone, just a count for the admin panel) ─────────────────
const activeVisitors = new Map(); // visitorId -> last-seen timestamp (ms)
// Logged-in members currently active — shown by name to staff in the admin
// panel (see privacy policy). Separate from the anonymous count above.
const onlineAuthedUsers = new Map(); // discordId -> last-seen timestamp (ms)
const HEARTBEAT_TIMEOUT_MS = 60 * 1000;

function pruneStaleVisitors() {
  const now = Date.now();
  for (const [id, lastSeen] of activeVisitors) {
    if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) activeVisitors.delete(id);
  }
  for (const [id, lastSeen] of onlineAuthedUsers) {
    if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) onlineAuthedUsers.delete(id);
  }
}

// ── Sale helper: never trust the client — always recompute the discounted
// price/cost server-side from the live sales table. ────────────────────────
function applyDiscount(amount, discountPercent) {
  if (!discountPercent) return amount;
  return Math.max(0, Math.round(amount * (1 - discountPercent / 100)));
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(auth.attachUser);
app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_ID_PATTERN = /^\d{15,25}$/;

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { discordId, password } = req.body;

  if (!discordId || !DISCORD_ID_PATTERN.test(discordId.trim())) {
    return res.status(400).json({ error: 'Please enter a valid Discord User ID (15-25 digits).' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const cleanId = discordId.trim();
  if (db.getUser(cleanId)) {
    return res.status(409).json({ error: 'An account with this Discord ID already exists. Try logging in instead.' });
  }

  // Display names are no longer typed by the player — resolved automatically:
  // 1) live lookup straight from the Discord API (server member list), 2) the
  // bot's last cached push (if the API lookup isn't configured/available),
  // 3) the raw Discord ID as a last resort until either source catches up.
  const cleanName = (await discordapi.resolveDiscordName(cleanId)) || db.getCachedDiscordName(cleanId) || cleanId;

  const passwordHash = auth.hashPassword(password);
  db.createUser(cleanId, passwordHash, cleanName);
  auth.setSessionCookie(res, cleanId);
  res.json({ discordId: cleanId, name: cleanName, signupBonusAvailable: true });
});

app.post('/api/auth/login', (req, res) => {
  const { discordId, password } = req.body;
  const cleanId = (discordId || '').trim();

  const user = db.getUser(cleanId);
  if (!user || !auth.verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect Discord ID or password.' });
  }

  auth.setSessionCookie(res, cleanId);
  res.json({ discordId: cleanId });
});

app.post('/api/auth/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ loggedIn: false });
  const user = db.getUser(req.user.discordId);
  res.json({
    loggedIn: true,
    discordId: req.user.discordId,
    name: (user?.display_name && user.display_name.trim()) || req.user.discordId,
    coins: db.getBalance(req.user.discordId),
    isVip: !!(user && user.is_vip),
    signupBonusClaimed: !!(user && user.signup_bonus_claimed),
  });
});

app.post('/api/me/claim-signup-bonus', auth.requireAuth, (req, res) => {
  const result = db.claimSignupBonus(req.user.discordId);
  if (!result.ok) {
    return res.status(409).json({ error: result.reason });
  }
  res.json({ ok: true, newBalance: result.newBalance });
});

// Display names are auto-synced from Discord and are no longer player-
// editable (see privacy policy) — this is now an admin-panel-only action for
// correcting a name manually (e.g. before the bot has synced someone yet).
app.post('/api/admin-panel/accounts/:discordId/name', adminPanel.requireAdminPanel, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name || name.length < 2 || name.length > 30) {
    return res.status(400).json({ error: 'Please enter a name between 2 and 30 characters.' });
  }
  if (!db.getUser(req.params.discordId)) {
    return res.status(404).json({ error: 'No account found with that Discord ID.' });
  }
  db.updateDisplayName(req.params.discordId, name);
  res.json({ name });
});

// ── Config / Packages / Chests (public, read-only) ────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

app.get('/api/packages', (req, res) => {
  const withSales = Object.values(PACKAGES).map((pkg) => {
    const discountPercent = db.getSale('package', pkg.id);
    const salePriceEur = discountPercent ? Math.round(pkg.priceEur * (1 - discountPercent / 100) * 100) / 100 : pkg.priceEur;
    return { ...pkg, discountPercent, salePriceEur };
  });
  res.json(withSales);
});

app.get('/api/chests', (req, res) => {
  // Don't leak exact weights to the client — just what's needed to render the UI
  const publicChests = Object.values(CHESTS).map((c) => {
    const discountPercent = db.getSale('chest', c.id);
    return {
      id: c.id,
      label: c.label,
      cost: c.cost,
      salePrice: applyDiscount(c.cost, discountPercent),
      discountPercent,
      image: c.image,
      color: c.color,
      category: c.category || 'dino',
      possibleItems: c.pool.map((i) => ({ name: i.name, emoji: i.emoji, image: i.image })),
    };
  });
  // Tier chests first (row 1), then dino chests (row 2) — ascending cost within each row.
  const categoryOrder = { tier: 0, dino: 1 };
  publicChests.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 1) - (categoryOrder[b.category] ?? 1);
    return catDiff !== 0 ? catDiff : a.cost - b.cost;
  });
  res.json(publicChests);
});

app.get('/api/catalog', (req, res) => {
  const withSales = {};
  for (const [key, category] of Object.entries(CATALOG)) {
    withSales[key] = {
      ...category,
      tiers: category.tiers.map((tier) => {
        const discountPercent = db.getSale('catalog', tier.id);
        return { ...tier, salePrice: applyDiscount(tier.cost, discountPercent), discountPercent };
      }),
    };
  }
  res.json(withSales);
});

app.get('/api/combos', (req, res) => {
  const withSales = COMBO_PACKS.map((combo) => {
    const discountPercent = db.getSale('combo', combo.id);
    return { ...combo, salePrice: applyDiscount(combo.cost, discountPercent), discountPercent };
  });
  res.json(withSales);
});

// ── Daily Lucky Wheel ──────────────────────────────────────────────────────────
app.get('/api/spin/segments', (req, res) => {
  // Public — needed to render the wheel even before logging in
  res.json(SPIN_SEGMENTS.map((s) => ({ amount: s.amount, label: s.label, jackpot: s.jackpot })));
});

app.get('/api/spin/status', auth.requireAuth, (req, res) => {
  res.json(db.getSpinStatus(req.user.discordId));
});

app.post('/api/spin', auth.requireAuth, (req, res) => {
  const status = db.getSpinStatus(req.user.discordId);
  if (!status.canSpin) {
    return res.status(400).json({ error: 'You already spun today. Come back later!', nextSpinAt: status.nextSpinAt });
  }

  const segmentIndex = drawSpinSegmentIndex();
  const segment = SPIN_SEGMENTS[segmentIndex];

  const result = db.trySpin(req.user.discordId, segment.amount, segment.jackpot);
  if (!result) {
    // Extremely rare race condition (two simultaneous requests) — treat as "too soon"
    return res.status(400).json({ error: 'You already spun today. Come back later!' });
  }

  res.json({
    segmentIndex,
    amount: segment.amount,
    jackpot: segment.jackpot,
    newBalance: result.newBalance,
    nextSpinAt: result.nextSpinAt,
  });
});

// ── VIP Lucky Wheel (same mechanics, VIP-only, doubled prizes) ────────────────
app.get('/api/spin/vip-segments', (req, res) => {
  res.json(VIP_SPIN_SEGMENTS.map((s) => ({ amount: s.amount, label: s.label, jackpot: s.jackpot })));
});

app.get('/api/spin/vip-status', auth.requireAuth, (req, res) => {
  const user = db.getUser(req.user.discordId);
  if (!user || !user.is_vip) return res.json({ isVip: false });
  res.json({ isVip: true, ...db.getVipSpinStatus(req.user.discordId) });
});

app.post('/api/spin/vip', auth.requireAuth, (req, res) => {
  const user = db.getUser(req.user.discordId);
  if (!user || !user.is_vip) {
    return res.status(403).json({ error: 'The VIP Lucky Wheel is only available to VIP members.' });
  }

  const status = db.getVipSpinStatus(req.user.discordId);
  if (!status.canSpin) {
    return res.status(400).json({ error: 'You already spun the VIP wheel today. Come back later!', nextSpinAt: status.nextSpinAt });
  }

  const segmentIndex = drawVipSpinSegmentIndex();
  const segment = VIP_SPIN_SEGMENTS[segmentIndex];

  const result = db.tryVipSpin(req.user.discordId, segment.amount, segment.jackpot);
  if (!result) {
    return res.status(400).json({ error: 'You already spun the VIP wheel today. Come back later!' });
  }

  res.json({
    segmentIndex,
    amount: segment.amount,
    jackpot: segment.jackpot,
    newBalance: result.newBalance,
    nextSpinAt: result.nextSpinAt,
  });
});

app.post('/api/catalog/:tierId/buy', auth.requireAuth, (req, res) => {
  const found = findTier(req.params.tierId);
  if (!found) return res.status(404).json({ error: 'Unknown item.' });

  const { category, tier } = found;
  const discountPercent = db.getSale('catalog', tier.id);
  const finalCost = applyDiscount(tier.cost, discountPercent);

  const newBalance = db.spendCoins(req.user.discordId, finalCost);
  if (newBalance === null) {
    return res.status(400).json({ error: `Not enough coins. This costs ${finalCost.toLocaleString()} coins.` });
  }

  db.logShopPurchase(req.user.discordId, tier.id, finalCost, tier.name);

  res.json({
    item: { name: tier.name, emoji: category.emoji, image: category.image },
    newBalance,
  });
});

// ── Combo Packs ──────────────────────────────────────────────────────────────────
app.post('/api/combos/:comboId/buy', auth.requireAuth, (req, res) => {
  const combo = findCombo(req.params.comboId);
  if (!combo) return res.status(404).json({ error: 'Unknown combo pack.' });

  const discountPercent = db.getSale('combo', combo.id);
  const finalCost = applyDiscount(combo.cost, discountPercent);

  const newBalance = db.spendCoins(req.user.discordId, finalCost);
  if (newBalance === null) {
    return res.status(400).json({ error: `Not enough coins. This costs ${finalCost.toLocaleString()} coins.` });
  }

  const itemDescription = `${combo.name} (${combo.contents.join(' + ')})`;
  db.logShopPurchase(req.user.discordId, combo.id, finalCost, itemDescription);

  res.json({
    item: { name: combo.name, emoji: '🎁', image: combo.image },
    newBalance,
  });
});

// ── Promo code check (public preview — actual application happens server-side) ──
app.post('/api/promo/validate', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, reason: 'No code provided.' });

  const result = db.validatePromoCode(code);
  if (!result.valid) return res.json({ valid: false, reason: result.reason });
  res.json({
    valid: true,
    type: result.promo.type,
    bonusPercent: result.promo.bonus_percent,
    rewardCoins: result.promo.reward_coins,
  });
});

// ── Redeem a flat-reward code directly (no purchase needed) ───────────────────
app.post('/api/promo/redeem', auth.requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided.' });

  const result = db.validatePromoCode(code);
  if (!result.valid) return res.status(400).json({ error: result.reason });
  if (result.promo.type !== 'reward') {
    return res.status(400).json({ error: 'This code is a top-up bonus — enter it while buying Coins instead.' });
  }
  if (db.hasUserRedeemed(result.promo.code, req.user.discordId)) {
    return res.status(400).json({ error: "You've already redeemed this code." });
  }

  const newBalance = db.redeemPromoForUser(result.promo.code, req.user.discordId, result.promo.reward_coins);
  res.json({ coins: result.promo.reward_coins, newBalance });
});

// ── PayPal top-up (requires login — coins go to the logged-in account) ────────
app.post('/api/orders', auth.requireAuth, async (req, res) => {
  try {
    const { packageId, promoCode } = req.body;
    const pkg = PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: 'Unknown package.' });

    let finalCoins = pkg.coins;
    let bonusPercent = 0;
    let appliedPromoCode = null;

    // Sale on a Coin package discounts the EUR price — the Coins granted stay the same.
    const saleDiscountPercent = db.getSale('package', pkg.id);
    const chargeEur = saleDiscountPercent
      ? Math.round(pkg.priceEur * (1 - saleDiscountPercent / 100) * 100) / 100
      : pkg.priceEur;

    if (promoCode) {
      const result = db.validatePromoCode(promoCode);
      if (!result.valid) return res.status(400).json({ error: result.reason });
      if (result.promo.type !== 'bonus') {
        return res.status(400).json({ error: 'This code is a direct Coin reward — redeem it instead of applying it to a top-up.' });
      }
      bonusPercent = result.promo.bonus_percent;
      appliedPromoCode = result.promo.code;
      finalCoins = Math.round(pkg.coins * (1 + bonusPercent / 100));
    }

    const order = await paypal.createOrder({
      priceEur: chargeEur,
      description: `Primal Hell Coins - ${pkg.label} (${finalCoins} Coins)`,
    });

    db.createPendingPurchase({
      paypalOrderId: order.id,
      discordId: req.user.discordId,
      packageId: pkg.id,
      priceEur: chargeEur,
      coins: finalCoins,
      promoCode: appliedPromoCode,
      bonusPercent,
      isSandbox: process.env.PAYPAL_ENV !== 'live',
    });

    res.json({ id: order.id });
  } catch (err) {
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Could not create order.' });
  }
});

app.post('/api/orders/:orderId/capture', auth.requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const captureData = await paypal.captureOrder(orderId);

    if (captureData.status === 'COMPLETED') {
      const purchase = db.markPurchaseCompleted(orderId);
      return res.json({ status: 'COMPLETED', coins: purchase?.coins ?? 0, newBalance: db.getBalance(req.user.discordId) });
    }

    res.status(400).json({ error: 'Payment not completed.', status: captureData.status });
  } catch (err) {
    console.error('Capture error:', err.message);
    res.status(500).json({ error: 'Could not confirm payment.' });
  }
});

// ── Chest opening (requires login, spends coins from the in-shop balance) ─────
app.post('/api/chests/:tier/open', auth.requireAuth, (req, res) => {
  const chest = CHESTS[req.params.tier];
  if (!chest) return res.status(404).json({ error: 'Unknown chest tier.' });

  const discountPercent = db.getSale('chest', chest.id);
  const finalCost = applyDiscount(chest.cost, discountPercent);

  const newBalance = db.spendCoins(req.user.discordId, finalCost);
  if (newBalance === null) {
    return res.status(400).json({ error: `Not enough coins. This chest costs ${finalCost.toLocaleString()} coins.` });
  }

  const item = drawFromChest(chest.id);
  db.logChestOpening(req.user.discordId, chest.id, finalCost, item.name);

  res.json({
    item: { name: item.name, emoji: item.emoji, image: item.image },
    newBalance,
  });
});

app.get('/api/chests/history', auth.requireAuth, (req, res) => {
  res.json(db.getChestHistory(req.user.discordId));
});

// ── My Items (requires login — shows the logged-in player's own item history) ─
// ── Item name -> image lookup (built once, used to enrich "My Items" results,
// since the DB only stores the item's name, not which image it maps to) ──────
function buildItemImageIndex() {
  const index = {};
  Object.values(CATALOG).forEach((category) => {
    category.tiers.forEach((tier) => { index[tier.name] = category.image; });
  });
  Object.values(CHESTS).forEach((chest) => {
    chest.pool.forEach((item) => { if (item.image) index[item.name] = item.image; });
  });
  COMBO_PACKS.forEach((combo) => {
    // Must match the exact string built in the /api/combos/:comboId/buy route below
    const itemDescription = `${combo.name} (${combo.contents.join(' + ')})`;
    index[itemDescription] = combo.image;
  });
  return index;
}
const ITEM_IMAGE_INDEX = buildItemImageIndex();

function enrichWithImages(items) {
  return items.map((item) => ({ ...item, image: ITEM_IMAGE_INDEX[item.item_won] || null }));
}

app.get('/api/me/items', auth.requireAuth, (req, res) => {
  res.json(enrichWithImages(db.getItemsForUser(req.user.discordId)));
});

// ── Bot sync (protected by shared secret, not user login) ─────────────────────
app.get('/api/bot/pending-purchases', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(db.getUnprocessedPurchases());
});

app.post('/api/bot/mark-processed/:id', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  db.markProcessedByBot(req.params.id);
  res.json({ ok: true });
});

// ── Bot sync for Lucky Wheel win DMs ────────────────────────────────────────────
app.get('/api/bot/pending-spins', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(db.getUnnotifiedSpins());
});

app.post('/api/bot/mark-spin-notified/:id', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  db.markSpinNotified(req.params.id);
  res.json({ ok: true });
});

// ── Bot sync for reward-code redemption DMs ─────────────────────────────────────
app.get('/api/bot/pending-redemptions', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(db.getUnnotifiedRedemptions());
});

app.post('/api/bot/mark-redemption-notified/:id', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  db.markRedemptionNotified(req.params.id);
  res.json({ ok: true });
});

// ── Admin: set/unset a player's VIP flag ────────────────────────────────────────
app.post('/api/admin/set-vip', requireBotSecret, (req, res) => {
  const { discordId, isVip: vipFlag } = req.body;
  if (!discordId) return res.status(400).json({ error: 'discordId is required.' });
  if (!db.getUser(discordId)) return res.status(404).json({ error: 'No shop account found for that Discord ID.' });

  db.setVip(discordId, !!vipFlag);
  res.json({ ok: true, discordId, isVip: !!vipFlag });
});

// ── Directly credit Coins to a player's balance (used for Discord-activity tier
// rewards — no promo code / manual redemption needed, same as the Lucky Wheel) ──
app.post('/api/admin/grant-coins', requireBotSecret, (req, res) => {
  const { discordId, amount } = req.body;
  if (!discordId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'discordId and a positive amount are required.' });
  }
  if (!db.getUser(discordId)) return res.status(404).json({ error: 'No shop account found for that Discord ID.' });

  db.addCoins(discordId, Math.round(Number(amount)));
  res.json({ ok: true, discordId, newBalance: db.getBalance(discordId) });
});

// ── Discord-activity tier progress (message count pushed live from the bot) ────
app.post('/api/admin/update-tier-progress', requireBotSecret, (req, res) => {
  const { discordId, messageCount, discordName } = req.body;
  if (!discordId || !Number.isFinite(Number(messageCount))) {
    return res.status(400).json({ error: 'discordId and messageCount are required.' });
  }
  db.setTierProgress(discordId, Math.round(Number(messageCount)), discordName);
  res.json({ ok: true });
});

app.get('/api/me/tier-progress', auth.requireAuth, (req, res) => {
  const messageCount = db.getTierProgress(req.user.discordId);
  res.json(getPublicTierProgress(messageCount));
});

// ── Public leaderboard for the Spotlight tab ─────────────────────────────────
app.get('/api/leaderboard/top-ranks', async (req, res) => {
  const rows = db.getTopTierProgress(5);
  const guildMap = await discordapi.getGuildMemberMap();

  const leaderboard = rows.map((row, index) => {
    const { currentTier } = computeTierProgress(row.message_count);
    let name = row.display_name;
    if (!name && guildMap.has(row.discord_id)) {
      name = guildMap.get(row.discord_id);
      db.setTierProgress(row.discord_id, row.message_count, name); // cache for next time
    }
    return {
      rank: index + 1,
      name: name || `Player #${row.discord_id.slice(-4)}`,
      tierName: currentTier ? currentTier.name : 'Unranked',
    };
  });
  res.json(leaderboard);
});

// ── Bot sync for VIP spin-win DMs ────────────────────────────────────────────────
app.get('/api/bot/pending-vip-spins', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(db.getUnnotifiedVipSpins());
});

app.post('/api/bot/mark-vip-spin-notified/:id', (req, res) => {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  db.markVipSpinNotified(req.params.id);
  res.json({ ok: true });
});

// ── Admin item management (called by the bot's admin-only Discord commands) ───
function requireBotSecret(req, res, next) {
  const key = req.headers['x-bot-secret'];
  if (!process.env.BOT_SYNC_SECRET || key !== process.env.BOT_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/admin/items/:discordId', requireBotSecret, (req, res) => {
  res.json(enrichWithImages(db.getItemsForUser(req.params.discordId)));
});

app.post('/api/admin/items/:itemId/redeem', requireBotSecret, (req, res) => {
  const { adminDiscordId } = req.body;
  const item = db.redeemItem(req.params.itemId, adminDiscordId || 'unknown');
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  res.json(item);
});

// ── Admin promo code management ───────────────────────────────────────────────
app.post('/api/admin/promo', requireBotSecret, (req, res) => {
  const { code, type, bonusPercent, rewardCoins, expiresInHours, maxUses, createdBy } = req.body;

  if (!code || !/^[A-Za-z0-9_-]{3,30}$/.test(code)) {
    return res.status(400).json({ error: 'Code can only contain letters, numbers, "-" or "_" (no spaces or symbols like "!"). Try something like NEWSHOP20.' });
  }
  if (type !== 'bonus' && type !== 'reward') {
    return res.status(400).json({ error: 'Type must be "bonus" or "reward".' });
  }
  if (db.getPromoCode(code)) {
    return res.status(409).json({ error: 'A code with this name already exists.' });
  }

  if (type === 'bonus') {
    if (!bonusPercent || bonusPercent <= 0 || bonusPercent > 500) {
      return res.status(400).json({ error: 'Bonus percent must be between 1 and 500.' });
    }
  } else {
    if (!rewardCoins || rewardCoins <= 0 || rewardCoins > 1000000) {
      return res.status(400).json({ error: 'Reward coins must be between 1 and 1,000,000.' });
    }
  }

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const normalized = db.createPromoCode({
    code, type,
    bonusPercent: type === 'bonus' ? bonusPercent : null,
    rewardCoins: type === 'reward' ? rewardCoins : null,
    expiresAt, maxUses: maxUses || null, createdBy,
  });

  res.json({ code: normalized, type, bonusPercent, rewardCoins, expiresAt, maxUses: maxUses || null });
});

app.get('/api/admin/promo', requireBotSecret, (req, res) => {
  res.json(db.getAllPromoCodes());
});

app.delete('/api/admin/promo/:code', requireBotSecret, (req, res) => {
  const deleted = db.deletePromoCode(req.params.code);
  if (!deleted) return res.status(404).json({ error: 'No promo code found with that name.' });
  res.json({ deleted: true });
});

app.delete('/api/admin/promo/cleanup/inactive', requireBotSecret, (req, res) => {
  const count = db.deleteInactivePromoCodes();
  res.json({ deletedCount: count });
});

// ── Live balance lookup for the Discord bot's /balance command ────────────────
// (the bot no longer keeps its own copy of the balance — the shop is the only
// source of truth, since coins can be spent in the shop without the bot knowing)
app.get('/api/admin/balance/:discordId', requireBotSecret, (req, res) => {
  res.json({ discordId: req.params.discordId, coins: db.getBalance(req.params.discordId) });
});

// ── Admin: fix a mistyped Discord ID on an existing account ────────────────────
app.post('/api/admin/migrate-discord-id', requireBotSecret, (req, res) => {
  const { oldDiscordId, newDiscordId } = req.body;

  if (!oldDiscordId || !newDiscordId || !/^\d{15,25}$/.test(newDiscordId)) {
    return res.status(400).json({ error: 'Both oldDiscordId and a valid newDiscordId (15-25 digits) are required.' });
  }

  const result = db.migrateDiscordId(oldDiscordId.trim(), newDiscordId.trim());
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

// ── Admin Panel (password-gated sales management, separate from user accounts) ──
app.post('/api/admin-panel/login', (req, res) => {
  const { password } = req.body;
  if (!adminPanel.checkPassword(password || '')) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  adminPanel.setAdminPanelCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin-panel/check', (req, res) => {
  const token = req.cookies?.[adminPanel.ADMIN_PANEL_COOKIE];
  res.json({ authorized: adminPanel.verifyAdminPanelToken(token) });
});

// ── Sellable items list + current sales, for the admin panel UI ────────────────
// ── Accounts overview: who has signed up, how many Coins, since when ──────────
app.get('/api/admin-panel/accounts', adminPanel.requireAdminPanel, async (req, res) => {
  const accounts = db.getAllAccounts();
  const guildMap = await discordapi.getGuildMemberMap();

  for (const acc of accounts) {
    const looksUnset = !acc.display_name || !acc.display_name.trim() || acc.display_name === acc.discord_id;
    if (looksUnset && guildMap.has(acc.discord_id)) {
      acc.display_name = guildMap.get(acc.discord_id);
      db.updateDisplayName(acc.discord_id, acc.display_name);
    }
  }

  res.json(accounts);
});

// ── Shop-wide announcement popup ────────────────────────────────────────────────
app.get('/api/announcement', (req, res) => {
  res.json(db.getAnnouncement());
});

app.post('/api/admin-panel/announcement', adminPanel.requireAdminPanel, (req, res) => {
  const { message, active } = req.body;
  if (active && (!message || !message.trim())) {
    return res.status(400).json({ error: 'Please enter a message before activating the announcement.' });
  }
  db.setAnnouncement((message || '').trim(), !!active);
  res.json({ ok: true });
});

app.post('/api/admin-panel/exclude-analytics', adminPanel.requireAdminPanel, (req, res) => {
  const { discordId, excluded } = req.body;
  if (!discordId) return res.status(400).json({ error: 'discordId is required.' });
  db.setExcludeFromAnalytics(discordId, !!excluded);
  res.json({ ok: true, discordId, excluded: !!excluded });
});

// ── Live visitor heartbeat (public — anonymous unless logged in; see privacy
// policy for what's shown to staff while a member is active) ──────────────────
app.post('/api/heartbeat', (req, res) => {
  const { visitorId } = req.body;
  if (visitorId && typeof visitorId === 'string' && visitorId.length <= 100) {
    activeVisitors.set(visitorId, Date.now());
  }
  if (req.user) {
    onlineAuthedUsers.set(req.user.discordId, Date.now());
  }
  res.json({ ok: true });
});

// ── Analytics ──────────────────────────────────────────────────────────────────
app.get('/api/admin-panel/analytics', adminPanel.requireAdminPanel, async (req, res) => {
  pruneStaleVisitors();
  const guildMap = await discordapi.getGuildMemberMap();
  const onlineUsers = [...onlineAuthedUsers.keys()].map((discordId) => {
    const user = db.getUser(discordId);
    let displayName = (user?.display_name && user.display_name.trim()) || null;
    if (!displayName && guildMap.has(discordId)) {
      displayName = guildMap.get(discordId);
      db.updateDisplayName(discordId, displayName);
    }
    return { discordId, displayName: displayName || discordId };
  });
  res.json({
    online: activeVisitors.size,
    onlineUsers,
    revenue: db.getRevenueAnalytics(),
    economy: db.getEconomyStats(),
  });
});

app.get('/api/admin-panel/items', adminPanel.requireAdminPanel, (req, res) => {
  const catalogItems = [];
  for (const category of Object.values(CATALOG)) {
    for (const tier of category.tiers) {
      catalogItems.push({ type: 'catalog', id: tier.id, label: `${category.label} — ${tier.name}`, basePrice: tier.cost });
    }
  }
  const chestItems = Object.values(CHESTS).map((c) => ({ type: 'chest', id: c.id, label: c.label, basePrice: c.cost }));
  const packageItems = Object.values(PACKAGES).map((p) => ({ type: 'package', id: p.id, label: `${p.label} (€${p.priceEur})`, basePrice: p.priceEur }));
  const comboItems = COMBO_PACKS.map((c) => ({ type: 'combo', id: c.id, label: c.name, basePrice: c.cost }));

  res.json({
    items: [...catalogItems, ...chestItems, ...packageItems, ...comboItems],
    sales: db.getAllSales(),
  });
});

app.post('/api/admin-panel/sales', adminPanel.requireAdminPanel, (req, res) => {
  const { itemType, itemId, discountPercent } = req.body;
  if (!['catalog', 'chest', 'package', 'combo'].includes(itemType)) {
    return res.status(400).json({ error: 'Invalid item type.' });
  }
  if (!itemId) return res.status(400).json({ error: 'itemId is required.' });
  const pct = Number(discountPercent);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 95) {
    return res.status(400).json({ error: 'Discount must be between 1 and 95 percent.' });
  }

  db.setSale(itemType, itemId, Math.round(pct));
  res.json({ ok: true });
});

app.post('/api/admin-panel/sales/remove', adminPanel.requireAdminPanel, (req, res) => {
  const { itemType, itemId } = req.body;
  if (!itemType || !itemId) return res.status(400).json({ error: 'itemType and itemId are required.' });
  db.removeSale(itemType, itemId);
  res.json({ ok: true });
});

// ── Global error handler ───────────────────────────────────────────────────────
// Ensures any unexpected crash in a route returns clean JSON instead of an HTML
// stack-trace page (which broke the Discord bot's aiohttp JSON parsing before).
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error. Please check the shop logs.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Primal Hell Shop running on port ${PORT} (PayPal env: ${process.env.PAYPAL_ENV || 'sandbox'})`);
});
