require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { PACKAGES } = require('./packages');
const { CHESTS, drawFromChest } = require('./chests');
const { CATALOG, findTier } = require('./catalog');
const paypal = require('./paypal');
const db = require('./db');
const auth = require('./auth');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(auth.attachUser);
app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_ID_PATTERN = /^\d{15,25}$/;

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
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

  const passwordHash = auth.hashPassword(password);
  db.createUser(cleanId, passwordHash);
  auth.setSessionCookie(res, cleanId);
  res.json({ discordId: cleanId });
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
  res.json({
    loggedIn: true,
    discordId: req.user.discordId,
    coins: db.getBalance(req.user.discordId),
  });
});

// ── Config / Packages / Chests (public, read-only) ────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

app.get('/api/packages', (req, res) => {
  res.json(Object.values(PACKAGES));
});

app.get('/api/chests', (req, res) => {
  // Don't leak exact weights to the client — just what's needed to render the UI
  const publicChests = Object.values(CHESTS).map((c) => ({
    id: c.id,
    label: c.label,
    cost: c.cost,
    image: c.image,
    color: c.color,
    possibleItems: c.pool.map((i) => ({ name: i.name, emoji: i.emoji, image: i.image })),
  }));
  res.json(publicChests);
});

app.get('/api/catalog', (req, res) => {
  res.json(CATALOG);
});

app.post('/api/catalog/:tierId/buy', auth.requireAuth, (req, res) => {
  const found = findTier(req.params.tierId);
  if (!found) return res.status(404).json({ error: 'Unknown item.' });

  const { category, tier } = found;
  const newBalance = db.spendCoins(req.user.discordId, tier.cost);
  if (newBalance === null) {
    return res.status(400).json({ error: `Not enough coins. This costs ${tier.cost.toLocaleString()} coins.` });
  }

  db.logShopPurchase(req.user.discordId, tier.id, tier.cost, tier.name);

  res.json({
    item: { name: tier.name, emoji: category.emoji, image: category.image },
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
      priceEur: pkg.priceEur,
      description: `Primal Hell Coins - ${pkg.label} (${finalCoins} Coins)`,
    });

    db.createPendingPurchase({
      paypalOrderId: order.id,
      discordId: req.user.discordId,
      packageId: pkg.id,
      priceEur: pkg.priceEur,
      coins: finalCoins,
      promoCode: appliedPromoCode,
      bonusPercent,
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

  const newBalance = db.spendCoins(req.user.discordId, chest.cost);
  if (newBalance === null) {
    return res.status(400).json({ error: `Not enough coins. This chest costs ${chest.cost.toLocaleString()} coins.` });
  }

  const item = drawFromChest(chest.id);
  db.logChestOpening(req.user.discordId, chest.id, chest.cost, item.name);

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

// ── Live balance lookup for the Discord bot's /balance command ────────────────
// (the bot no longer keeps its own copy of the balance — the shop is the only
// source of truth, since coins can be spent in the shop without the bot knowing)
app.get('/api/admin/balance/:discordId', requireBotSecret, (req, res) => {
  res.json({ discordId: req.params.discordId, coins: db.getBalance(req.params.discordId) });
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
