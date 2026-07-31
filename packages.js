// Coin top-up packages. bonusCoins = the extra coins bigger packages include,
// shown separately in the UI the way online shops do it ("2,400 +250 Bonus").
const PACKAGES = {
  starter: { id: 'starter', label: 'Starter', priceEur: 4.90, baseCoins: 1200, bonusCoins: 0, coins: 1200, image: '/images/packages/starter.jpg' },
  standard: { id: 'standard', label: 'Standard', priceEur: 9.90, baseCoins: 2400, bonusCoins: 250, coins: 2650, image: '/images/packages/standard.jpg' },
  booster: { id: 'booster', label: 'Booster', priceEur: 14.90, baseCoins: 3600, bonusCoins: 400, coins: 4000, image: '/images/packages/booster.jpg' },
  premium: { id: 'premium', label: 'Premium', priceEur: 24.90, baseCoins: 6000, bonusCoins: 1000, coins: 7000, image: '/images/packages/premium.jpg' },
  elite: { id: 'elite', label: 'Elite', priceEur: 34.90, baseCoins: 8400, bonusCoins: 1600, coins: 10000, image: '/images/packages/ultimate.jpg' },
  ultimate: { id: 'ultimate', label: 'Ultimate', priceEur: 44.90, baseCoins: 11000, bonusCoins: 2500, coins: 13500, image: '/images/packages/ultimate.jpg' },
  mega: { id: 'mega', label: 'Mega', priceEur: 69.90, baseCoins: 17000, bonusCoins: 4000, coins: 21000, image: '/images/packages/mega.jpg' },
};

module.exports = { PACKAGES };
