// ── State ────────────────────────────────────────────────────────────────────
let currentUser = null; // { discordId, coins } or null
let paypalReady = false;
let appliedPromo = null; // { code, bonusPercent } or null

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
      renderMyItems();
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
      renderMyItems();
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
      <span class="auth-id">${currentUser.discordId}</span>
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
      renderMyItems();
      showToast('Logged out.', 'info');
    });
  } else {
    el.innerHTML = `<button class="btn-primary" id="headerLoginBtn">Log In / Sign Up</button>`;
    document.getElementById('headerLoginBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

function renderLoginGates() {
  document.getElementById('loginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('chestLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('itemsLoginGate').style.display = currentUser ? 'none' : 'flex';
  document.getElementById('catalogLoginGate').style.display = currentUser ? 'none' : 'flex';
}

// ── PayPal SDK + Packages ─────────────────────────────────────────────────────
async function loadPayPalSdk() {
  const configRes = await fetch('/api/config');
  const { clientId } = await configRes.json();

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
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

    card.innerHTML = `
      ${pkg.id === 'premium' ? '<span class="package-badge">Popular</span>' : ''}
      <span class="package-label">${pkg.label}</span>
      <span class="package-coins">${pkg.baseCoins.toLocaleString('en-US')} <small>Primal Coins</small> <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
      ${bonusHtml}
      <span class="package-price">€${pkg.priceEur.toFixed(2)}</span>
      <div class="paypal-button-container" id="paypal-btn-${pkg.id}"></div>
    `;
    packagesEl.appendChild(card);

    if (currentUser && paypalReady) {
      renderPayPalButton(pkg.id);
    }
  });
}

function renderPayPalButton(packageId) {
  const container = document.getElementById(`paypal-btn-${packageId}`);
  if (!container) return;

  window.paypal.Buttons({
    style: { layout: 'horizontal', color: 'black', shape: 'pill', label: 'pay', height: 40 },

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
async function renderChests() {
  const grid = document.getElementById('chestsGrid');
  const res = await fetch('/api/chests');
  const chests = await res.json();
  grid.innerHTML = '';

  chests.forEach((chest) => {
    chest.possibleItems.forEach((i) => { CHEST_ITEM_EMOJI[i.name] = i.emoji; });

    const backItems = chest.possibleItems.map((i) => {
      const icon = i.image
        ? `<img class="chest-back-thumb" src="${i.image}" alt="" />`
        : `<span class="chest-back-emoji">${i.emoji}</span>`;
      return `<li>${icon}${i.name}</li>`;
    }).join('');

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
            <span class="chest-cost">${chest.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
            <button class="btn-primary chest-open-btn" data-chest="${chest.id}" data-image="${chest.image}" data-label="${chest.label}" data-cost="${chest.cost}" ${!currentUser ? 'disabled' : ''}>
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
    grid.appendChild(wrap);
  });

  grid.querySelectorAll('.chest-open-btn').forEach((btn) => {
    btn.addEventListener('click', () => openChest(btn.dataset.chest, btn.dataset.image, btn, btn.dataset.label, btn.dataset.cost));
  });
  grid.querySelectorAll('[data-flip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const flipCard = btn.closest('.chest-card-flip');
      flipCard.classList.toggle('flipped');
    });
  });
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

function showResultModal(item) {
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
async function renderMyItems() {
  const listEl = document.getElementById('itemsList');
  const emptyEl = document.getElementById('itemsEmpty');
  if (!currentUser) { listEl.innerHTML = ''; emptyEl.style.display = 'none'; return; }

  const res = await fetch('/api/me/items');
  if (!res.ok) return;
  const items = await res.json();

  if (items.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
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

// Best-effort emoji lookup (falls back to 🎁) — built once chest data is fetched
const CHEST_ITEM_EMOJI = {};

// ── Direct-purchase catalog (Shop tab — fixed price, guaranteed item) ─────────
async function renderCatalog() {
  const container = document.getElementById('catalogCategories');
  const res = await fetch('/api/catalog');
  const catalog = await res.json();
  container.innerHTML = '';

  Object.values(catalog).forEach((category) => {
    const section = document.createElement('div');
    section.className = 'catalog-category';
    const headerIcon = category.image
      ? `<img class="catalog-category-thumb" src="${category.image}" alt="" />`
      : `<span class="catalog-category-emoji">${category.emoji}</span>`;
    const noteHtml = category.note ? `<p class="catalog-category-note">ℹ️ ${category.note}</p>` : '';
    section.innerHTML = `
      <div class="catalog-category-header">
        ${headerIcon}
        <h3 class="catalog-category-label">${category.label}</h3>
      </div>
      ${noteHtml}
      <div class="catalog-tiers">
        ${category.tiers.map((tier) => `
          <div class="catalog-tier">
            <span class="catalog-tier-name">${tier.name}</span>
            <span class="catalog-tier-cost">${tier.cost.toLocaleString('en-US')} Primal Coins <img class="coin-icon-sm" src="/images/logo.jpg" alt="" /></span>
            <button class="btn-primary catalog-buy-btn" data-tier="${tier.id}" data-name="${tier.name.replace(/"/g, '&quot;')}" data-cost="${tier.cost}" ${!currentUser ? 'disabled' : ''}>
              ${currentUser ? 'Buy' : 'Log in to buy'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(section);
  });

  container.querySelectorAll('.catalog-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => buyCatalogItem(btn.dataset.tier, btn, btn.dataset.name, btn.dataset.cost));
  });
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

// ── Gate buttons (Shop / Chests tabs) ─────────────────────────────────────────
function setupGateButtons() {
  document.getElementById('gateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('chestGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('itemsGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('catalogGateLoginBtn').addEventListener('click', () => openAuthModal('login'));
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
async function init() {
  setupTabs();
  setupAuthModal();
  setupResultModal();
  setupGateButtons();
  setupPromoBox();

  await refreshMe();
  await loadPayPalSdk();
  await renderPackages();
  await renderChests();
  await renderCatalog();
  await renderMyItems();
}

init().catch((err) => {
  console.error(err);
  showToast('The shop could not load. Please refresh the page.', 'error');
});
