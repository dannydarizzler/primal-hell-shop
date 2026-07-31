// ── State ────────────────────────────────────────────────────────────────────
let currentUser = null; // { discordId, coins } or null
let paypalReady = false;
let appliedPromo = null; // { code, bonusPercent } or null
let latestPackages = [];
let latestCombos = [];

// ── Toast helper ─────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ── Tab navigation ────────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tabName}`));
}

function setupTabs() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

// ── Auth modal ────────────────────────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.add('show');
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}
function switchAuthTab(tab) {
  document.querySelectorAll('.modal-tab').forEach((t) => t.classList.toggle('active', t.dataset.authtab === tab));
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}

function setupAuthModal() {
  document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target.id === 'authModal') closeAuthModal();
  });
  document.querySelectorAll('.modal-tab').forEach((t) => {
    t.addEventListener('click', () => switchAuthTab(t.dataset.authtab));
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const discordId = document.getElementById('loginDiscordId').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, password }),
      });
      const data = await res.json();
      if (!res.ok) { errorEl.textContent = data.error; return; }
      closeAuthModal();
      showToast('Logged in!', 'success');
      await refreshMe();
      renderPackages();
      renderChests();
      renderCatalog();
      renderCombos();
      renderMyItems();
      refreshSpinStatus();
      refreshVipWheel();
      checkSignupBonusPopup();
    } catch {
      errorEl.textContent = 'Something went wrong. Please try again.';
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const discordId = document.getElementById('registerDiscordId').value.trim();
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, password }),
      });
      const data = await res.json();
      if (!res.ok) { errorEl.textContent = data.error; return; }
      closeAuthModal();
      showToast('Account created!', 'success');
      await refreshMe();
      renderPackages();
      renderChests();
      renderCatalog();
      renderCombos();
      renderMyItems();
      refreshSpinStatus();
      refreshVipWheel();
      checkSignupBonusPopup();
    } catch {
      errorEl.textContent = 'Something went wrong. Please try again.';
    }
  });
}

// ── Auth state / header rendering ─────────────────────────────────────────────
async function refreshMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  currentUser = data.loggedIn ? data : null;
  renderAuthArea();
  renderLoginGates();
}

function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (currentUser) {
    el.innerHTML = `
      <span class="auth-balance" id="balanceBtn" title="Buy more Primal Coins">💰 ${currentUser.coins.toLocaleString('en-US')} <img class="coin-icon" src="/images/logo.jpg" alt="Primal Coins" /></span>
      <span class="auth-id">${currentUser.name}</span>
      <button class="btn-ghost" id="logoutBtn">Log Out</button>
    `;
    document.getElementById('balanceBtn').addEventListener('click', () => switchTab('coins'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      renderAuthArea();
      renderLoginGates();
      renderPackages();
      renderChests();
      renderCatalog();
      renderCombos();
      renderMyItems();
      refreshSpinStatus();
      refreshVipWheel();
      showToast('Logged out.', 'info');
    });
  } else {
    el.innerHTML = `<button class="btn-primary" id="headerLoginBtn">Log In / Sign Up</button>`;
    document.getElementById('headerLoginBtn').addEventListener('click', () => openAuthModal('login'));
  }
  renderProfile();
}

function renderLoginGates() {
  document.getElementById('loginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('chestLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('itemsLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('catalogLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('wheelLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('profileLoginGate').style.display = currentUser ? 'none' : 'flex';
}

function renderProfile() {
  const card = document.getElementById('profileCard');
  const tierCard = document.getElementById('tierProgressCard');
  if (!currentUser) { card.style.display = 'none'; tierCard.style.display = 'none'; return; }

  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileDiscordId').textContent = currentUser.discordId;
  document.getElementById('profileBalance').textContent = `${currentUser.coins.toLocaleString('en-US')} Primal Coins`;
  card.style.display = 'block';

  renderTierProgress();
}

async function renderTierProgress() {
  const tierCard = document.getElementById('tierProgressCard');
  try {
    const res = await fetch('/api/me/tier-progress');
    if (!res.ok) { tierCard.style.display = 'none'; return; }
    const data = await res.json();

    const currentLabel = document.getElementById('tierCurrentLabel');
    const nextLabel = document.getElementById('tierNextLabel');
    const barFill = document.getElementById('tierProgressBarFill');
    const barPercent = document.getElementById('tierProgressBarPercent');
    const barTrack = document.querySelector('.tier-progress-bar-track');

    currentLabel.innerHTML = data.currentTierName
      ? `Current rank: <strong>${data.currentTierName}</strong>`
      : `No rank yet — get active in Discord!`;

    if (data.maxed) {
      nextLabel.innerHTML = `<strong>Max rank reached!</strong> 🎉`;
      barTrack.style.display = 'none';
    } else {
      nextLabel.innerHTML = `Next rank: <strong>${data.nextTierName}</strong> — reward: <strong>${data.nextTierReward.toLocaleString('en-US')} Coins</strong>`;
      barTrack.style.display = 'block';
      barFill.style.width = `${Math.max(0, Math.min(100, data.progressPercent))}%`;
      barPercent.textContent = `${data.progressPercent}%`;
    }

    tierCard.style.display = 'block';
  } catch {
    tierCard.style.display = 'none';
  }
}

async function renderLeaderboard() {
  const body = document.getElementById('leaderboardBody');
  if (!body) return;
  try {
    const res = await fetch('/api/leaderboard/top-ranks');
    if (!res.ok) throw new Error('bad response');
    const rows = await res.json();

    if (rows.length === 0) {
      body.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">No ranked members yet — get active in Discord!</td></tr>`;
      return;
    }

    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    body.innerHTML = rows.map((row) => `
      <tr>
        <td class="leaderboard-rank">${medals[row.rank] || row.rank}</td>
        <td class="leaderboard-name">${row.name}</td>
        <td class="leaderboard-tier">${row.tierName}</td>
      </tr>
    `).join('');
  } catch {
    body.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">Could not load the leaderboard.</td></tr>`;
  }
}

// ── PayPal SDK + Packages ─────────────────────────────────────────────────────
async function loadPayPalSdk() {
  const configRes = await fetch('/api/config');
  const { clientId } = await configRes.json();

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&locale=en_US`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const placeholder = document.getElementById('paypal-sdk');
  if (placeholder) placeholder.remove();
  paypalReady = true;
}

async function renderPackages() {
  const packagesEl = document.getElementById('packages');
  const res = await fetch('/api/packages');
  const packages = await res.json();
  latestPackages = packages;
  packagesEl.innerHTML = '';

  packages.forEach((pkg) => {
    const card = document.createElement('div');
    card.className = 'package-card' + (pkg.id === 'premium' ? ' featured' : '');

    let bonusHtml = '';
    if (appliedPromo) {
      const promoBonus = Math.round(pkg.coins * (appliedPromo.bonusPercent / 100));
      const newTotal = pkg.coins + promoBonus;
      bonusHtml = `
        <span class="package-bonus">+${pkg.bonusCoins.toLocaleString('en-US')} Bonus + ${appliedPromo.bonusPercent}% Promo</span>
        <span class="package-total">${newTotal.toLocaleString('en-US')} Primal Coins total <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
      `;
    } else if (pkg.bonusCoins > 0) {
      bonusHtml = `
        <span class="package-bonus">+${pkg.bonusCoins.toLocaleString('en-US')} Bonus</span>
        <span class="package-total">${pkg.coins.toLocaleString('en-US')} Primal Coins total <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
      `;
    }

    const priceHtml = pkg.discountPercent > 0
      ? `<span class="package-price"><span class="price-original">€${pkg.priceEur.toFixed(2)}</span> <span class="price-sale">€${pkg.salePriceEur.toFixed(2)}</span><span class="sale-badge">-${pkg.discountPercent}%</span></span>`
      : `<span class="package-price">€${pkg.priceEur.toFixed(2)}</span>`;

    card.innerHTML = `
      ${pkg.id === 'premium' ? '<span class="package-badge">Popular</span>' : ''}
      <div class="package-image-wrap"><img src="${pkg.image}" alt="" loading="lazy" /></div>
      <span class="package-label">${pkg.label}</span>
      <span class="package-coins">${pkg.baseCoins.toLocaleString('en-US')} <small>Primal Coins</small> <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
      ${bonusHtml}
      ${priceHtml}
      <div class="paypal-button-container" id="paypal-btn-${pkg.id}"></div>
    `;
    packagesEl.appendChild(card);

    if (currentUser && paypalReady) {
      renderPayPalButton(pkg.id);
    }
  });

  const vipCard = document.createElement('div');
  vipCard.className = 'package-card vip-promo-card';
  vipCard.innerHTML = `
    <div class="vip-ribbon">VIP</div>
    <span class="package-label">💎 VIP Access</span>
    <ul class="vip-benefits">
      <li>🎡 Extra spin on the exclusive VIP Lucky Wheel</li>
      <li>🪙 1,000 Primal Coins every month</li>
      <li>🎉 Access to VIP-only Giveaways</li>
    </ul>
    <p class="vip-cta">Boost the server to gain VIP access</p>
  `;
  packagesEl.appendChild(vipCard);

  renderSaleTab();
}

function renderPayPalButton(packageId) {
  const container = document.getElementById(`paypal-btn-${packageId}`);
  if (!container) return;

  window.paypal.Buttons({
    style: { layout: 'horizontal', color: 'black', shape: 'pill', label: 'pay', height: 40, tagline: false },

    createOrder: async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, promoCode: appliedPromo?.code || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      return data.id;
    },

    onApprove: async (data) => {
      showToast('Confirming payment…', 'info');
      const res = await fetch(`/api/orders/${data.orderID}/capture`, { method: 'POST' });
      const result = await res.json();

      if (res.ok && result.status === 'COMPLETED') {
        showToast(`Payment successful! ${result.coins.toLocaleString('en-US')} Primal Coins added.`, 'success');
        currentUser.coins = result.newBalance;
        renderAuthArea();
      } else {
        showToast('Payment could not be confirmed. Please contact an admin on Discord.', 'error');
      }
    },

    onCancel: () => showToast('Payment cancelled.', 'info'),
    onError: (err) => {
      console.error(err);
      showToast(err?.message || 'Something went wrong with the payment.', 'error');
    },
  }).render(`#paypal-btn-${packageId}`);
}

// ── Confirm-purchase modal (reused by chests + catalog buys) ─────────────────
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmModal');
    document.getElementById('confirmMessage').textContent = message;
    overlay.classList.add('show');

    const yesBtn = document.getElementById('confirmYesBtn');
    const noBtn = document.getElementById('confirmNoBtn');

    const cleanup = (result) => {
      overlay.classList.remove('show');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      overlay.removeEventListener('click', onOverlayClick);
      resolve(result);
    };
    const onYes = () => cleanup(true);
    const onNo = () => cleanup(false);
    const onOverlayClick = (e) => { if (e.target === overlay) cleanup(false); };

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
    overlay.addEventListener('click', onOverlayClick);
  });
}

// ── Chests ─────────────────────────────────────────────────────────────────────
let latestChests = [];

function buildChestCard(chest) {
  chest.possibleItems.forEach((i) => { CHEST_ITEM_EMOJI[i.name] = i.emoji; });

  const backItems = chest.possibleItems.map((i) => {
    const icon = i.image
      ? `<img class="chest-back-thumb" src="${i.image}" alt="" />`
      : `<span class="chest-back-emoji">${i.emoji}</span>`;
    return `<li>${icon}${i.name}</li>`;
  }).join('');

  const costHtml = chest.discountPercent > 0
    ? `<span class="chest-cost"><span class="price-original">${chest.cost.toLocaleString('en-US')}</span> <span class="price-sale">${chest.salePrice.toLocaleString('en-US')}</span> Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /><span class="sale-badge">-${chest.discountPercent}%</span></span>`
    : `<span class="chest-cost">${chest.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>`;
  const effectiveCost = chest.discountPercent > 0 ? chest.salePrice : chest.cost;

  const wrap = document.createElement('div');
  wrap.className = 'chest-card-flip';
  wrap.innerHTML = `
    <div class="chest-card-inner">
      <div class="chest-face ${chest.color}">
        <div class="chest-image-wrap">
          <img src="${chest.image}" alt="${chest.label}" loading="lazy" />
          <button class="chest-details-btn" data-flip="${chest.id}">Details</button>
        </div>
        <div class="chest-body">
          <h3 class="chest-title">${chest.label}</h3>
          ${costHtml}
          <button class="btn-primary chest-open-btn" data-chest="${chest.id}" data-image="${chest.image}" data-label="${chest.label}" data-cost="${effectiveCost}" ${!currentUser ? 'disabled' : ''}>
            ${currentUser ? 'Open Chest' : 'Log in to open'}
          </button>
        </div>
      </div>
      <div class="chest-face chest-face-back ${chest.color}">
        <h3 class="chest-back-title">Possible Items</h3>
        <ul class="chest-back-list">${backItems}</ul>
        <button class="btn-ghost chest-back-btn" data-flip="${chest.id}">← Back</button>
      </div>
    </div>
  `;
  return wrap;
}

async function renderChests() {
  const gridTiers = document.getElementById('chestsGridTiers');
  const gridDinos = document.getElementById('chestsGridDinos');
  const res = await fetch('/api/chests');
  const chests = await res.json();
  latestChests = chests;
  gridTiers.innerHTML = '';
  gridDinos.innerHTML = '';

  chests.forEach((chest) => {
    const card = buildChestCard(chest);
    (chest.category === 'tier' ? gridTiers : gridDinos).appendChild(card);
  });

  [gridTiers, gridDinos].forEach((grid) => {
    grid.querySelectorAll('.chest-open-btn').forEach((btn) => {
      btn.addEventListener('click', () => openChest(btn.dataset.chest, btn.dataset.image, btn, btn.dataset.label, btn.dataset.cost));
    });
    grid.querySelectorAll('[data-flip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const flipCard = btn.closest('.chest-card-flip');
        flipCard.classList.toggle('flipped');
      });
    });
  });

  renderSaleTab();
}

// ── Dramatic chest-opening sequence ─────────────────────────────────────────────
function spawnParticles(container) {
  container.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'opening-particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 100;
    p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    p.style.background = Math.random() > 0.5 ? 'var(--ember)' : 'var(--lava)';
    container.appendChild(p);
  }
  requestAnimationFrame(() => {
    container.querySelectorAll('.opening-particle').forEach((p, i) => {
      setTimeout(() => p.classList.add('fly'), i * 15);
    });
  });
}

function playOpeningAnimation(chestImage) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('openingOverlay');
    const img = document.getElementById('openingChestImg');
    const rays = document.getElementById('openingRays');
    const flash = document.getElementById('openingFlash');
    const particles = document.getElementById('openingParticles');

    img.src = chestImage;
    img.className = 'opening-chest-img';
    rays.classList.remove('show');
    flash.classList.remove('burst');
    particles.innerHTML = '';
    overlay.classList.add('show');

    setTimeout(() => rays.classList.add('show'), 50);

    // Shake for ~1.1s, then burst
    setTimeout(() => {
      img.classList.add('crack');
      flash.classList.add('burst');
      spawnParticles(particles);
    }, 1100);

    // Close the overlay and resolve so the result modal can show
    setTimeout(() => {
      overlay.classList.remove('show');
      resolve();
    }, 1700);
  });
}

async function openChest(tierId, chestImage, btnEl, chestLabel, chestCost) {
  if (!currentUser) { openAuthModal('login'); return; }

  const costText = chestCost ? `${Number(chestCost).toLocaleString('en-US')} Primal Coins` : 'Primal Coins';
  const confirmed = await showConfirm(`Are you sure you would like to open the ${chestLabel || 'chest'} for ${costText}?`);
  if (!confirmed) return;

  btnEl.disabled = true;
  const originalText = btnEl.textContent;
  btnEl.textContent = 'Opening…';

  try {
    const [apiResult] = await Promise.all([
      fetch(`/api/chests/${tierId}/open`, { method: 'POST' }).then(async (res) => ({ res, data: await res.json() })),
      playOpeningAnimation(chestImage),
    ]);

    const { res, data } = apiResult;
    if (!res.ok) {
      showToast(data.error || 'Could not open this chest.', 'error');
      return;
    }

    currentUser.coins = data.newBalance;
    renderAuthArea();
    renderMyItems();
    showResultModal(data.item);
  } catch {
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

function showResultModal(item, needsRedemption = true) {
  const thumbEl = document.getElementById('resultThumb');
  const emojiEl = document.getElementById('resultEmoji');
  if (item.image) {
    thumbEl.src = item.image;
    thumbEl.style.display = 'block';
    emojiEl.style.display = 'none';
  } else {
    thumbEl.style.display = 'none';
    emojiEl.style.display = 'block';
    emojiEl.textContent = item.emoji;
  }
  document.getElementById('resultName').textContent = item.name;
  document.getElementById('resultNote').style.display = needsRedemption ? 'block' : 'none';
  document.getElementById('resultModal').classList.add('show');
}
function closeResultModal() {
  document.getElementById('resultModal').classList.remove('show');
}

function setupResultModal() {
  document.getElementById('resultModalClose').addEventListener('click', closeResultModal);
  document.getElementById('resultCloseBtn').addEventListener('click', closeResultModal);
  document.getElementById('resultModal').addEventListener('click', (e) => {
    if (e.target.id === 'resultModal') closeResultModal();
  });
}

// ── My Items ───────────────────────────────────────────────────────────────────
let allMyItems = [];
let myItemsFilter = 'all';

async function renderMyItems() {
  const listEl = document.getElementById('itemsList');
  const emptyEl = document.getElementById('itemsEmpty');
  if (!currentUser) { listEl.innerHTML = ''; emptyEl.style.display = 'none'; return; }

  const res = await fetch('/api/me/items');
  if (!res.ok) return;
  allMyItems = await res.json();

  renderFilteredMyItems();
}

function renderFilteredMyItems() {
  const listEl = document.getElementById('itemsList');
  const emptyEl = document.getElementById('itemsEmpty');

  const items = myItemsFilter === 'all'
    ? allMyItems
    : allMyItems.filter((item) => item.status === myItemsFilter);

  if (allMyItems.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  if (items.length === 0) {
    listEl.innerHTML = `<p class="items-empty">No ${myItemsFilter} items.</p>`;
    emptyEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';

  listEl.innerHTML = items.map((item) => {
    const icon = item.image
      ? `<img class="item-thumb" src="${item.image}" alt="" />`
      : `<span class="item-emoji">${CHEST_ITEM_EMOJI[item.item_won] || '🎁'}</span>`;
    return `
      <div class="item-row ${item.status}">
        ${icon}
        <div class="item-info">
          <p class="item-name">${item.item_won}</p>
        </div>
        <span class="item-status ${item.status}">${item.status === 'redeemed' ? 'Redeemed' : 'Active'}</span>
      </div>
    `;
  }).join('');
}

function setupItemsFilter() {
  document.querySelectorAll('.items-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.items-filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      myItemsFilter = btn.dataset.filter;
      renderFilteredMyItems();
    });
  });
}

// Best-effort emoji lookup (falls back to 🎁) — built once chest data is fetched
const CHEST_ITEM_EMOJI = {};

// ── Direct-purchase catalog (Shop tab — fixed price, guaranteed item) ─────────
function renderTierPrice(tier) {
  if (tier.discountPercent > 0) {
    return `
      <span class="catalog-tier-cost">
        <span class="price-original">${tier.cost.toLocaleString('en-US')}</span>
        <span class="price-sale">${tier.salePrice.toLocaleString('en-US')}</span> Primal Coins
        <img class="coin-icon-sm" src="/images/logo.jpg" alt="" />
        <span class="sale-badge">-${tier.discountPercent}%</span>
      </span>`;
  }
  return `<span class="catalog-tier-cost">${tier.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>`;
}

function renderTierCard(category, tier) {
  const priceHtml = tier.discountPercent > 0
    ? `<span class="chest-cost"><span class="price-original">${tier.cost.toLocaleString('en-US')}</span> <span class="price-sale">${tier.salePrice.toLocaleString('en-US')}</span> Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /><span class="sale-badge">-${tier.discountPercent}%</span></span>`
    : `<span class="chest-cost">${tier.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>`;
  const effectiveCost = tier.discountPercent > 0 ? tier.salePrice : tier.cost;
  const safeName = tier.name.replace(/"/g, '&quot;');
  const noteParts = [];
  if (tier.note) noteParts.push(tier.note);
  if (category.note) noteParts.push(category.note);
  const backNote = noteParts.length > 0
    ? `ℹ️ ${noteParts.join(' ')}`
    : `Part of the <strong>${category.label}</strong> catalog.`;

  const wrap = document.createElement('div');
  wrap.className = 'chest-card-flip';
  wrap.innerHTML = `
    <div class="chest-card-inner">
      <div class="chest-face">
        <div class="chest-image-wrap">
          <img src="${category.image}" alt="${tier.name}" loading="lazy" />
          <button class="chest-details-btn" data-tierflip="${tier.id}">Details</button>
        </div>
        <div class="chest-body">
          <h3 class="chest-title">${tier.name}</h3>
          ${priceHtml}
          <button class="btn-primary catalog-buy-btn" data-tier="${tier.id}" data-name="${safeName}" data-cost="${effectiveCost}" ${!currentUser ? 'disabled' : ''}>
            ${currentUser ? 'Buy' : 'Log in to buy'}
          </button>
        </div>
      </div>
      <div class="chest-face chest-face-back">
        <h3 class="chest-back-title">${tier.name}</h3>
        <p class="catalog-back-note">${backNote}</p>
        <button class="btn-ghost chest-back-btn" data-tierflip="${tier.id}">← Back</button>
      </div>
    </div>
  `;
  return wrap;
}

function renderCategoryCard(category) {
  const group = document.createElement('div');
  group.className = 'catalog-category-group';

  const headerIcon = category.image
    ? `<img class="catalog-group-icon" src="${category.image}" alt="" />`
    : `<span class="catalog-category-emoji">${category.emoji}</span>`;
  const header = document.createElement('div');
  header.className = 'catalog-group-header';
  header.innerHTML = `${headerIcon}<h3 class="catalog-category-label">${category.label}</h3>`;
  group.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'tier-grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 260px))';
  category.tiers.forEach((tier) => grid.appendChild(renderTierCard(category, tier)));
  group.appendChild(grid);

  return group;
}

let latestCatalog = null;

async function renderCatalog() {
  const containers = {
    single: document.getElementById('catalogCategories'),
    cosmetics: document.getElementById('cosmeticsCategories'),
    chaosDinos: document.getElementById('chaosDinosCategories'),
    bossFights: document.getElementById('bossFightsCategories'),
  };
  const res = await fetch('/api/catalog');
  latestCatalog = await res.json();
  Object.values(containers).forEach((c) => { c.innerHTML = ''; });

  Object.values(latestCatalog).forEach((category) => {
    const target = containers[category.group] || containers.single;
    target.appendChild(renderCategoryCard(category));
  });

  Object.values(containers).forEach((c) => {
    c.querySelectorAll('.catalog-buy-btn').forEach((btn) => {
      btn.addEventListener('click', () => buyCatalogItem(btn.dataset.tier, btn, btn.dataset.name, btn.dataset.cost));
    });
    c.querySelectorAll('[data-tierflip]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.chest-card-flip').classList.toggle('flipped'));
    });
  });

  renderSaleTab();
}

async function buyCatalogItem(tierId, btnEl, itemName, itemCost) {
  if (!currentUser) { openAuthModal('login'); return; }

  const costText = itemCost ? `${Number(itemCost).toLocaleString('en-US')} Primal Coins` : 'Primal Coins';
  const confirmed = await showConfirm(`Are you sure you would like to purchase "${itemName || 'this item'}" for ${costText}?`);
  if (!confirmed) return;

  btnEl.disabled = true;
  const originalText = btnEl.textContent;
  btnEl.textContent = 'Buying…';

  try {
    const res = await fetch(`/api/catalog/${tierId}/buy`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not complete purchase.', 'error');
      return;
    }

    currentUser.coins = data.newBalance;
    renderAuthArea();
    renderMyItems();
    showResultModal(data.item);
  } catch {
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

// ── Daily Lucky Wheel (+ VIP variant) ──────────────────────────────────────────
const SEGMENT_ANGLE = 360 / 9; // 9 fixed segments, both wheels

const STANDARD_WHEEL = {
  segmentsUrl: '/api/spin/segments',
  statusUrl: '/api/spin/status',
  spinUrl: '/api/spin',
  discId: 'wheelDisc',
  btnId: 'spinBtn',
  statusId: 'spinStatus',
  btnLabel: 'Spin the Wheel',
  jackpotColor: '#3d1a5c',
};

const VIP_WHEEL = {
  segmentsUrl: '/api/spin/vip-segments',
  statusUrl: '/api/spin/vip-status',
  spinUrl: '/api/spin/vip',
  discId: 'vipWheelDisc',
  btnId: 'vipSpinBtn',
  statusId: 'vipSpinStatus',
  btnLabel: 'Spin the VIP Wheel',
  jackpotColor: '#5c1a4a',
};

function segmentColor(segment, index, jackpotColor) {
  if (segment.jackpot) return jackpotColor;
  return index % 2 === 0 ? '#2a1512' : '#3a1c16';
}

async function renderWheelConfig(config) {
  const res = await fetch(config.segmentsUrl);
  const segments = await res.json();

  const disc = document.getElementById(config.discId);
  const gradientStops = segments.map((s, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = (i + 1) * SEGMENT_ANGLE;
    return `${segmentColor(s, i, config.jackpotColor)} ${from}deg ${to}deg`;
  }).join(', ');
  disc.style.background = `conic-gradient(${gradientStops})`;

  disc.querySelectorAll('.wheel-label').forEach((el) => el.remove());

  const radius = 92;
  segments.forEach((s, i) => {
    const centerAngleDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const rad = (centerAngleDeg - 90) * (Math.PI / 180);
    const x = 130 + radius * Math.cos(rad);
    const y = 130 + radius * Math.sin(rad);

    const label = document.createElement('div');
    label.className = 'wheel-label' + (s.jackpot ? ' jackpot' : '');
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.innerHTML = s.jackpot
      ? `JACKPOT<br>${s.amount.toLocaleString('en-US')}`
      : `${s.amount}`;
    disc.appendChild(label);
  });
}

const spinCountdownIntervals = {};
function startSpinCountdownConfig(config, nextSpinAtIso) {
  const statusEl = document.getElementById(config.statusId);
  const btn = document.getElementById(config.btnId);
  clearInterval(spinCountdownIntervals[config.btnId]);

  const update = () => {
    const remaining = new Date(nextSpinAtIso).getTime() - Date.now();
    if (remaining <= 0) {
      clearInterval(spinCountdownIntervals[config.btnId]);
      btn.disabled = false;
      btn.textContent = config.btnLabel;
      statusEl.textContent = '';
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    statusEl.textContent = `Next free spin in ${h}h ${m}m`;
  };
  update();
  spinCountdownIntervals[config.btnId] = setInterval(update, 30000);
}

async function refreshSpinStatusConfig(config) {
  const btn = document.getElementById(config.btnId);
  const statusEl = document.getElementById(config.statusId);
  if (!currentUser) { btn.disabled = true; statusEl.textContent = ''; return; }

  try {
    const res = await fetch(config.statusUrl);
    const data = await res.json();

    if (data.canSpin) {
      btn.disabled = false;
      btn.textContent = config.btnLabel;
      statusEl.textContent = '';
    } else {
      btn.disabled = true;
      startSpinCountdownConfig(config, data.nextSpinAt);
    }
  } catch {
    // fail silently
  }
}

async function spinWheelConfig(config) {
  if (!currentUser) { openAuthModal('login'); return; }

  const btn = document.getElementById(config.btnId);
  const disc = document.getElementById(config.discId);
  btn.disabled = true;
  btn.textContent = 'Spinning…';

  try {
    const res = await fetch(config.spinUrl, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not spin right now.', 'error');
      if (data.nextSpinAt) startSpinCountdownConfig(config, data.nextSpinAt);
      else { btn.disabled = false; btn.textContent = config.btnLabel; }
      return;
    }

    const centerAngle = data.segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const extraTurns = 6;
    const rotation = extraTurns * 360 - centerAngle;
    disc.style.transform = `rotate(${rotation}deg)`;

    setTimeout(() => {
      currentUser.coins = data.newBalance;
      renderAuthArea();
      startSpinCountdownConfig(config, data.nextSpinAt);
      showResultModal({
        name: data.jackpot
          ? `JACKPOT! ${data.amount.toLocaleString('en-US')} Primal Coins`
          : `${data.amount.toLocaleString('en-US')} Primal Coins`,
        emoji: data.jackpot ? '🎉' : '🪙',
        image: '/images/logo.jpg',
      }, false);
    }, 4100);
  } catch {
    showToast('Something went wrong. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = config.btnLabel;
  }
}

async function renderWheel() { await renderWheelConfig(STANDARD_WHEEL); }
async function refreshSpinStatus() { await refreshSpinStatusConfig(STANDARD_WHEEL); }
async function spinWheel() { await spinWheelConfig(STANDARD_WHEEL); }

// ── VIP wheel visibility (only rendered/enabled for logged-in VIP members) ────
async function refreshVipWheel() {
  const btn = document.getElementById('vipSpinBtn');
  const statusEl = document.getElementById('vipSpinStatus');

  // Always render the wheel graphic, regardless of VIP status
  await renderWheelConfig(VIP_WHEEL);

  if (!currentUser) {
    btn.disabled = true;
    btn.textContent = '🔒 Log In to Check VIP Status';
    statusEl.textContent = '';
    return;
  }

  if (!currentUser.isVip) {
    btn.disabled = true;
    btn.textContent = '🔒 VIP Members Only';
    statusEl.textContent = 'Boost the server to unlock this wheel!';
    return;
  }

  await refreshSpinStatusConfig(VIP_WHEEL);
}

function setupWheel() {
  document.getElementById('spinBtn').addEventListener('click', spinWheel);
  document.getElementById('wheelGateLoginBtn').addEventListener('click', () => openAuthModal('login'));

  document.getElementById('vipSpinBtn').addEventListener('click', () => {
    if (!currentUser) { openAuthModal('login'); return; }
    if (!currentUser.isVip) { showToast('This wheel is exclusive to VIP members. Boost the server to unlock it!', 'info'); return; }
    spinWheelConfig(VIP_WHEEL);
  });
}

// ── Combo Packs ────────────────────────────────────────────────────────────────
function renderComboCard(combo) {
  const priceHtml = combo.discountPercent > 0
    ? `<span class="chest-cost"><span class="price-original">${combo.cost.toLocaleString('en-US')}</span> <span class="price-sale">${combo.salePrice.toLocaleString('en-US')}</span> Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /><span class="sale-badge">-${combo.discountPercent}%</span></span>`
    : `<span class="chest-cost">${combo.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>`;
  const effectiveCost = combo.discountPercent > 0 ? combo.salePrice : combo.cost;
  const backItems = combo.contents.map((c) => `<li><span class="chest-back-emoji">🎁</span>${c}</li>`).join('');

  const wrap = document.createElement('div');
  wrap.className = 'chest-card-flip';
  wrap.innerHTML = `
    <div class="chest-card-inner">
      <div class="chest-face combo">
        <div class="chest-image-wrap">
          <img src="${combo.image}" alt="${combo.name}" loading="lazy" />
          <button class="chest-details-btn" data-comboflip="${combo.id}">Details</button>
        </div>
        <div class="chest-body">
          <h3 class="chest-title">${combo.name}</h3>
          ${priceHtml}
          <button class="btn-primary combo-buy-btn" data-combo="${combo.id}" data-name="${combo.name}" data-cost="${effectiveCost}" ${!currentUser ? 'disabled' : ''}>
            ${currentUser ? 'Buy Combo' : 'Log in to buy'}
          </button>
        </div>
      </div>
      <div class="chest-face chest-face-back combo">
        <h3 class="chest-back-title">${combo.name}</h3>
        <ul class="chest-back-list">${backItems}</ul>
        <button class="btn-ghost chest-back-btn" data-comboflip="${combo.id}">← Back</button>
      </div>
    </div>
  `;
  return wrap;
}

function wireComboCardEvents(container) {
  container.querySelectorAll('.combo-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => buyCombo(btn.dataset.combo, btn, btn.dataset.name, btn.dataset.cost));
  });
  container.querySelectorAll('[data-comboflip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const flipCard = btn.closest('.chest-card-flip');
      flipCard.classList.toggle('flipped');
    });
  });
}

async function renderCombos() {
  const grid = document.getElementById('comboGrid');
  const res = await fetch('/api/combos');
  const combos = await res.json();
  latestCombos = combos;
  grid.innerHTML = '';

  combos.forEach((combo) => {
    grid.appendChild(renderComboCard(combo));
  });

  wireComboCardEvents(grid);

  renderSaleTab();
}

async function buyCombo(comboId, btnEl, comboName, comboCost) {
  if (!currentUser) { openAuthModal('login'); return; }

  const confirmed = await showConfirm(`Are you sure you would like to purchase "${comboName}" for ${Number(comboCost).toLocaleString('en-US')} Primal Coins?`);
  if (!confirmed) return;

  btnEl.disabled = true;
  const originalText = btnEl.textContent;
  btnEl.textContent = 'Buying…';

  try {
    const res = await fetch(`/api/combos/${comboId}/buy`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not complete purchase.', 'error');
      return;
    }

    currentUser.coins = data.newBalance;
    renderAuthArea();
    renderMyItems();
    showResultModal(data.item);
  } catch {
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalText;
  }
}

// ── Sale tab (aggregates every discounted item/chest/package/combo) ───────────
function renderSaleTab() {
  const container = document.getElementById('saleItems');
  const emptyMsg = document.getElementById('saleEmpty');
  container.innerHTML = '';
  let foundAny = false;

  // Catalog items on sale
  if (latestCatalog) {
    Object.values(latestCatalog).forEach((category) => {
      const discountedTiers = category.tiers.filter((t) => t.discountPercent > 0);
      if (discountedTiers.length > 0) {
        foundAny = true;
        container.appendChild(renderCategoryCard({ ...category, tiers: discountedTiers }));
      }
    });
  }

  // Chests on sale
  const discountedChests = latestChests.filter((c) => c.discountPercent > 0);
  if (discountedChests.length > 0) {
    foundAny = true;
    const wrap = document.createElement('div');
    wrap.className = 'catalog-category';
    wrap.innerHTML = `
      <div class="catalog-category-header"><span class="catalog-category-emoji">📦</span><h3 class="catalog-category-label">Mystery Chests</h3></div>
      <div class="catalog-tiers">
        ${discountedChests.map((c) => `
          <div class="catalog-tier">
            <span class="catalog-tier-name">${c.label}</span>
            <span class="catalog-tier-cost"><span class="price-original">${c.cost.toLocaleString('en-US')}</span> <span class="price-sale">${c.salePrice.toLocaleString('en-US')}</span> Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /><span class="sale-badge">-${c.discountPercent}%</span></span>
            <button class="btn-primary" data-goto-chest="${c.id}">Go to Chests tab</button>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(wrap);
  }

  // Combo packs on sale
  const discountedCombos = latestCombos.filter((c) => c.discountPercent > 0);
  if (discountedCombos.length > 0) {
    foundAny = true;
    const wrap = document.createElement('div');
    wrap.className = 'combo-grid';
    wrap.style.marginBottom = '1.25rem';
    discountedCombos.forEach((combo) => {
      wrap.appendChild(renderComboCard(combo));
    });
    container.appendChild(wrap);
    wireComboCardEvents(wrap);
  }

  // Coin packages on sale
  const discountedPackages = latestPackages.filter((p) => p.discountPercent > 0);
  if (discountedPackages.length > 0) {
    foundAny = true;
    const wrap = document.createElement('div');
    wrap.className = 'catalog-category';
    wrap.innerHTML = `
      <div class="catalog-category-header"><span class="catalog-category-emoji">💰</span><h3 class="catalog-category-label">Primal Coins</h3></div>
      <div class="catalog-tiers">
        ${discountedPackages.map((p) => `
          <div class="catalog-tier">
            <span class="catalog-tier-name">${p.label} — ${p.coins.toLocaleString('en-US')} Coins</span>
            <span class="catalog-tier-cost"><span class="price-original">€${p.priceEur.toFixed(2)}</span> <span class="price-sale">€${p.salePriceEur.toFixed(2)}</span><span class="sale-badge">-${p.discountPercent}%</span></span>
            <button class="btn-primary" data-goto-coins="1">Go to Buy Coins tab</button>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(wrap);
  }

  emptyMsg.style.display = foundAny ? 'none' : 'block';

  container.querySelectorAll('.catalog-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => buyCatalogItem(btn.dataset.tier, btn, btn.dataset.name, btn.dataset.cost));
  });
  container.querySelectorAll('[data-tierflip]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.chest-card-flip').classList.toggle('flipped'));
  });
  container.querySelectorAll('[data-goto-chest]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab('chests'));
  });
  container.querySelectorAll('[data-goto-coins]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab('coins'));
  });
}

// ── Shop sub-navigation (Sale / Essentials / Combo Packs / Other Stuff) ─────
function setupShopSubnav() {
  document.querySelectorAll('.shop-group-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      document.getElementById('shopGroupsGrid').style.display = 'none';
      document.querySelectorAll('#tab-shop .sub-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`subpanel-${tile.dataset.group}`).classList.add('active');
    });
  });

  document.querySelectorAll('[data-back="shop"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tab-shop .sub-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById('shopGroupsGrid').style.display = 'grid';
    });
  });
}

// ── Admin Panel (password-gated sales management) ─────────────────────────────
let adminPanelItemsCache = [];

function setupPrivacyModal() {
  const linkBtn = document.getElementById('privacyLinkBtn');
  const modal = document.getElementById('privacyModal');
  const closeBtn = document.getElementById('privacyClose');

  linkBtn.addEventListener('click', () => modal.classList.add('show'));
  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
}

function setupAdminPanel() {
  const linkBtn = document.getElementById('adminLinkBtn');
  const loginModal = document.getElementById('adminLoginModal');
  const loginClose = document.getElementById('adminLoginClose');
  const loginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('adminLoginError');
  const panelModal = document.getElementById('adminPanelModal');
  const panelClose = document.getElementById('adminPanelClose');
  const searchInput = document.getElementById('adminSearchInput');

  linkBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin-panel/check');
      const data = await res.json();
      if (data.authorized) {
        openAdminPanel();
      } else {
        loginModal.classList.add('show');
      }
    } catch {
      loginModal.classList.add('show');
    }
  });

  loginClose.addEventListener('click', () => loginModal.classList.remove('show'));
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) loginModal.classList.remove('show'); });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('adminPasswordInput').value;
    loginError.textContent = '';

    try {
      const res = await fetch('/api/admin-panel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { loginError.textContent = data.error; return; }

      loginModal.classList.remove('show');
      document.getElementById('adminPasswordInput').value = '';
      openAdminPanel();
    } catch {
      loginError.textContent = 'Something went wrong. Please try again.';
    }
  });

  panelClose.addEventListener('click', () => panelModal.classList.remove('show'));
  panelModal.addEventListener('click', (e) => { if (e.target === panelModal) panelModal.classList.remove('show'); });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('.admin-panel-row').forEach((row) => {
      row.style.display = row.dataset.label.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });

  document.querySelectorAll('.admin-panel-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-panel-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel-tabpanel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`admintab-${tab.dataset.admintab}`).classList.add('active');
      if (tab.dataset.admintab === 'accounts') loadAdminAccounts();
      if (tab.dataset.admintab === 'analytics') loadAdminAnalytics();
      if (tab.dataset.admintab === 'announcement') loadAdminAnnouncement();
    });
  });

  const accountSearchInput = document.getElementById('adminAccountSearchInput');
  accountSearchInput.addEventListener('input', () => {
    const q = accountSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('.admin-account-row').forEach((row) => {
      row.style.display = row.dataset.search.includes(q) ? 'flex' : 'none';
    });
  });
}

async function loadAdminAccounts() {
  const list = document.getElementById('adminAccountsList');
  list.innerHTML = '<p class="spin-status">Loading…</p>';

  try {
    const res = await fetch('/api/admin-panel/accounts');
    if (res.status === 401) {
      list.innerHTML = '<p class="form-error">Session expired — please log in again.</p>';
      return;
    }
    const accounts = await res.json();

    if (accounts.length === 0) {
      list.innerHTML = '<p class="spin-status">No accounts have signed up yet.</p>';
      return;
    }

    list.innerHTML = accounts.map((acc) => {
      const joined = new Date(acc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const searchBlob = `${acc.display_name} ${acc.discord_id}`.toLowerCase();
      const excluded = !!acc.exclude_from_analytics;
      return `
        <div class="admin-account-row ${excluded ? 'excluded' : ''}" data-search="${searchBlob}">
          <span class="admin-account-name">${acc.display_name || acc.discord_id}</span>
          ${acc.is_vip ? '<span class="admin-account-vip">VIP</span>' : ''}
          ${excluded ? '<span class="admin-account-excluded-badge">Excluded from Analytics</span>' : ''}
          <span class="admin-account-id">${acc.discord_id}</span>
          <span class="admin-account-coins">${acc.coins.toLocaleString('en-US')} Coins</span>
          <span class="admin-account-rank" title="Raw message count backing this rank">${acc.rank_name} (${acc.message_count || 0} msgs)</span>
          <span class="admin-account-date">Joined ${joined}</span>
          <button class="btn-ghost admin-row-btn" data-toggle-exclude="${acc.discord_id}" data-currently-excluded="${excluded}">
            ${excluded ? 'Include in Analytics' : 'Exclude from Analytics'}
          </button>
          <button class="btn-ghost admin-row-btn" data-rename="${acc.discord_id}" data-current-name="${(acc.display_name || '').replace(/"/g, '&quot;')}">
            Rename
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-rename]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const discordId = btn.dataset.rename;
        const newName = window.prompt('Correct name (this overrides the auto-sync from Discord until it next syncs):', btn.dataset.currentName);
        if (newName === null) return;
        const res = await fetch(`/api/admin-panel/accounts/${discordId}/name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Could not rename this account.', 'error'); return; }
        showToast('Name updated.', 'success');
        loadAdminAccounts();
      });
    });

    list.querySelectorAll('[data-toggle-exclude]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const discordId = btn.dataset.toggleExclude;
        const currentlyExcluded = btn.dataset.currentlyExcluded === 'true';
        const res = await fetch('/api/admin-panel/exclude-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discordId, excluded: !currentlyExcluded }),
        });
        if (!res.ok) { showToast('Could not update this account.', 'error'); return; }
        showToast(!currentlyExcluded ? 'Account excluded from Analytics.' : 'Account included in Analytics again.', 'success');
        loadAdminAccounts();
      });
    });
  } catch {
    list.innerHTML = '<p class="form-error">Could not load accounts. Please try again.</p>';
  }
}

async function loadAdminAnalytics() {
  const statsEl = document.getElementById('analyticsStats');
  const onlineEl = document.getElementById('analyticsOnlineList');
  const revenueEl = document.getElementById('analyticsRevenueList');
  const topItemsEl = document.getElementById('analyticsTopItemsList');
  statsEl.innerHTML = '<p class="spin-status">Loading…</p>';
  document.getElementById('discordApiStatus').innerHTML = '';
  onlineEl.innerHTML = '';
  revenueEl.innerHTML = '';
  topItemsEl.innerHTML = '';

  try {
    const res = await fetch('/api/admin-panel/analytics');
    if (res.status === 401) {
      statsEl.innerHTML = '<p class="form-error">Session expired — please log in again.</p>';
      return;
    }
    const data = await res.json();

    const apiStatusHtml = data.discordApi.configured
      ? `🟢 Discord name resolution is active — ${data.discordApi.guildMembersCached} members cached.`
      : `🟡 Discord name resolution is NOT configured — set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID on the shop's Railway service. Until then, names fall back to raw Discord IDs.`;
    document.getElementById('discordApiStatus').innerHTML = apiStatusHtml;
    document.getElementById('discordApiStatus').className = `discord-api-status ${data.discordApi.configured ? 'ok' : 'warn'}`;

    statsEl.innerHTML = `
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">${data.online}</span>
        <span class="analytics-stat-label">🟢 Online right now</span>
      </div>
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">€${data.revenue.totalEur.toFixed(2)}</span>
        <span class="analytics-stat-label">Total revenue (live only)</span>
      </div>
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">${data.revenue.totalPurchases}</span>
        <span class="analytics-stat-label">Completed purchases</span>
      </div>
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">${data.economy.totalCoins.toLocaleString('en-US')}</span>
        <span class="analytics-stat-label">Coins in circulation</span>
      </div>
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">${data.economy.totalAccounts}</span>
        <span class="analytics-stat-label">Registered accounts</span>
      </div>
      <div class="analytics-stat-card">
        <span class="analytics-stat-value">${data.economy.totalAccounts > 0 ? Math.round((data.economy.payingAccounts / data.economy.totalAccounts) * 100) : 0}%</span>
        <span class="analytics-stat-label">Conversion (${data.economy.payingAccounts} paying)</span>
      </div>
    `;

    onlineEl.innerHTML = data.onlineUsers.length === 0
      ? '<p class="spin-status">No logged-in members active right now.</p>'
      : data.onlineUsers.map((u) => `
        <div class="analytics-row">
          <span class="analytics-row-name">🟢 ${u.displayName}</span>
          <span class="analytics-row-value">${u.discordId}</span>
        </div>
      `).join('');

    revenueEl.innerHTML = data.revenue.rows.length === 0
      ? '<p class="spin-status">No live payments yet.</p>'
      : data.revenue.rows.slice(0, 15).map((r, i) => `
        <div class="analytics-row">
          <span class="analytics-row-rank">#${i + 1}</span>
          <span class="analytics-row-name">${r.display_name || r.discord_id}</span>
          <span class="analytics-row-value">€${r.total_eur.toFixed(2)} (${r.purchase_count}x)</span>
        </div>
      `).join('');

    topItemsEl.innerHTML = data.economy.topItems.length === 0
      ? '<p class="spin-status">No items purchased or drawn yet.</p>'
      : data.economy.topItems.map((item, i) => `
        <div class="analytics-row">
          <span class="analytics-row-rank">#${i + 1}</span>
          <span class="analytics-row-name">${item.item_won}</span>
          <span class="analytics-row-value">${item.cnt}x</span>
        </div>
      `).join('');
  } catch {
    statsEl.innerHTML = '<p class="form-error">Could not load analytics. Please try again.</p>';
  }
}

let announcementSaveWired = false;

async function loadAdminAnnouncement() {
  const input = document.getElementById('announcementInput');
  const toggle = document.getElementById('announcementActiveToggle');
  const errorEl = document.getElementById('announcementError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/announcement');
    const data = await res.json();
    input.value = data.message || '';
    toggle.checked = !!data.active;
  } catch {
    errorEl.textContent = 'Could not load the current announcement.';
  }

  if (!announcementSaveWired) {
    announcementSaveWired = true;
    document.getElementById('announcementSaveBtn').addEventListener('click', async () => {
      errorEl.textContent = '';
      try {
        const res = await fetch('/api/admin-panel/announcement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input.value, active: toggle.checked }),
        });
        const data = await res.json();
        if (!res.ok) { errorEl.textContent = data.error; return; }
        showToast(toggle.checked ? 'Announcement is now live for all players.' : 'Announcement saved (currently off).', 'success');
      } catch {
        errorEl.textContent = 'Something went wrong. Please try again.';
      }
    });
  }
}

// ── Announcement popup shown to every player while active ─────────────────────
async function checkAnnouncementPopup() {
  try {
    const res = await fetch('/api/announcement');
    const data = await res.json();
    if (data.active && data.message) {
      document.getElementById('announcementModalText').textContent = data.message;
      document.getElementById('announcementModal').classList.add('show');
    }
  } catch {
    // fail silently — a broken announcement check shouldn't block the shop
  }
}

function setupAnnouncementPopup() {
  document.getElementById('announcementDismissBtn').addEventListener('click', () => {
    document.getElementById('announcementModal').classList.remove('show');
  });
}

// ── Sign-up bonus (200 Coins, one-time, claimed via "Collect") ─────────────────
function checkSignupBonusPopup() {
  if (!currentUser || currentUser.signupBonusClaimed) return;
  document.getElementById('signupBonusModal').classList.add('show');
}

function setupSignupBonusPopup() {
  const btn = document.getElementById('signupBonusCollectBtn');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const res = await fetch('/api/me/claim-signup-bonus', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not claim your bonus.', 'error');
        document.getElementById('signupBonusModal').classList.remove('show');
        return;
      }
      currentUser.coins = data.newBalance;
      currentUser.signupBonusClaimed = true;
      renderAuthArea();
      document.getElementById('signupBonusModal').classList.remove('show');
      showToast('200 Primal Coins added to your balance!', 'success');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

async function openAdminPanel() {
  document.getElementById('adminPanelModal').classList.add('show');
  await loadAdminPanelItems();
}

async function loadAdminPanelItems() {
  const list = document.getElementById('adminPanelList');
  list.innerHTML = '<p class="spin-status">Loading…</p>';

  try {
    const res = await fetch('/api/admin-panel/items');
    if (res.status === 401) {
      list.innerHTML = '<p class="form-error">Session expired — please log in again.</p>';
      return;
    }
    const data = await res.json();
    adminPanelItemsCache = data.items;

    const salesMap = {};
    data.sales.forEach((s) => { salesMap[`${s.item_type}:${s.item_id}`] = s.discount_percent; });

    list.innerHTML = data.items.map((item) => {
      const key = `${item.type}:${item.id}`;
      const currentDiscount = salesMap[key] || '';
      const priceLabel = item.type === 'package' ? `€${item.basePrice}` : `${item.basePrice.toLocaleString('en-US')} Coins`;
      return `
        <div class="admin-panel-row ${currentDiscount ? 'has-sale' : ''}" data-label="${item.label.replace(/"/g, '&quot;')}" data-type="${item.type}" data-id="${item.id}">
          <span class="admin-row-label">${item.label}</span>
          <span class="admin-row-price">${priceLabel}</span>
          <input type="number" class="admin-row-input" min="1" max="95" placeholder="%" value="${currentDiscount}" />
          <button class="btn-primary admin-row-btn" data-action="apply">Apply</button>
          <button class="btn-ghost admin-row-btn" data-action="remove" ${!currentDiscount ? 'style="display:none;"' : ''}>Remove</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-action="apply"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-panel-row');
        const input = row.querySelector('.admin-row-input');
        const discountPercent = Number(input.value);
        if (!discountPercent || discountPercent <= 0 || discountPercent > 95) {
          showToast('Enter a discount between 1 and 95.', 'error');
          return;
        }
        const res = await fetch('/api/admin-panel/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: row.dataset.type, itemId: row.dataset.id, discountPercent }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Could not apply sale.', 'error'); return; }
        showToast('Sale applied!', 'success');
        row.classList.add('has-sale');
        row.querySelector('[data-action="remove"]').style.display = 'inline-block';
        refreshAllShopData();
      });
    });

    list.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-panel-row');
        const res = await fetch('/api/admin-panel/sales/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: row.dataset.type, itemId: row.dataset.id }),
        });
        if (!res.ok) { showToast('Could not remove sale.', 'error'); return; }
        showToast('Sale removed.', 'info');
        row.classList.remove('has-sale');
        row.querySelector('.admin-row-input').value = '';
        btn.style.display = 'none';
        refreshAllShopData();
      });
    });
  } catch {
    list.innerHTML = '<p class="form-error">Could not load items. Please try again.</p>';
  }
}

function refreshAllShopData() {
  renderPackages();
  renderChests();
  renderCatalog();
  renderCombos();
}

// ── Gate buttons (Shop / Chests tabs) ─────────────────────────────────────────
function setupGateButtons() {
  document.getElementById('gateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('chestGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('itemsGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('catalogGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('profileGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
}

// ── Promo code ─────────────────────────────────────────────────────────────────
let checkedRewardCode = null; // { code, rewardCoins } — set after a valid "reward" code is checked

function setupPromoBox() {
  document.getElementById('promoApplyBtn').addEventListener('click', async () => {
    const input = document.getElementById('promoInput');
    const feedback = document.getElementById('promoFeedback');
    const redeemBtn = document.getElementById('promoRedeemBtn');
    const code = input.value.trim();

    redeemBtn.style.display = 'none';
    checkedRewardCode = null;

    if (!code) {
      feedback.textContent = 'Enter a code first.';
      feedback.className = 'promo-feedback error';
      return;
    }

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!data.valid) {
        appliedPromo = null;
        feedback.textContent = data.reason || 'Invalid code.';
        feedback.className = 'promo-feedback error';
        renderPackages();
        return;
      }

      if (data.type === 'reward') {
        appliedPromo = null;
        checkedRewardCode = { code: code.toUpperCase(), rewardCoins: data.rewardCoins };
        feedback.textContent = `🎁 This code grants ${data.rewardCoins.toLocaleString('en-US')} Primal Coins directly — no purchase needed.`;
        feedback.className = 'promo-feedback success';
        redeemBtn.style.display = 'inline-block';
        renderPackages();
      } else {
        appliedPromo = { code: code.toUpperCase(), bonusPercent: data.bonusPercent };
        feedback.textContent = `🎉 Code applied! +${data.bonusPercent}% bonus Primal Coins on every package.`;
        feedback.className = 'promo-feedback success';
        renderPackages();
      }
    } catch {
      feedback.textContent = 'Something went wrong. Please try again.';
      feedback.className = 'promo-feedback error';
    }
  });

  document.getElementById('promoRedeemBtn').addEventListener('click', async () => {
    if (!currentUser) { openAuthModal('login'); return; }
    if (!checkedRewardCode) return;

    const feedback = document.getElementById('promoFeedback');
    const redeemBtn = document.getElementById('promoRedeemBtn');
    redeemBtn.disabled = true;
    redeemBtn.textContent = 'Redeeming…';

    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: checkedRewardCode.code }),
      });
      const data = await res.json();

      if (!res.ok) {
        feedback.textContent = data.error || 'Could not redeem this code.';
        feedback.className = 'promo-feedback error';
        return;
      }

      currentUser.coins = data.newBalance;
      renderAuthArea();
      feedback.textContent = `✅ ${data.coins.toLocaleString('en-US')} Primal Coins added to your balance!`;
      feedback.className = 'promo-feedback success';
      redeemBtn.style.display = 'none';
      checkedRewardCode = null;
      document.getElementById('promoInput').value = '';
    } catch {
      feedback.textContent = 'Something went wrong. Please try again.';
      feedback.className = 'promo-feedback error';
    } finally {
      redeemBtn.disabled = false;
      redeemBtn.textContent = 'Redeem Now';
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
// ── Live visitor heartbeat (anonymous, tab-local — cleared when the tab closes) ──
function getVisitorId() {
  let id = sessionStorage.getItem('ph_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('ph_visitor_id', id);
  }
  return id;
}

function sendHeartbeat() {
  fetch('/api/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: getVisitorId() }),
  }).catch(() => {});
}

async function init() {
  setupTabs();
  setupAuthModal();
  setupResultModal();
  setupGateButtons();
  setupPromoBox();
  setupWheel();
  setupShopSubnav();
  setupAdminPanel();
  setupPrivacyModal();
  setupAnnouncementPopup();
  setupSignupBonusPopup();
  setupItemsFilter();

  await refreshMe();
  checkSignupBonusPopup();
  await loadPayPalSdk();
  await renderPackages();
  await renderChests();
  await renderCatalog();
  await renderCombos();
  await renderMyItems();
  await renderWheel();
  await refreshSpinStatus();
  await refreshVipWheel();
  await renderLeaderboard();
}

init().catch((err) => {
  console.error(err);
  showToast('The shop could not load. Please refresh the page.', 'error');
});

checkAnnouncementPopup();

sendHeartbeat();
setInterval(sendHeartbeat, 20000);
