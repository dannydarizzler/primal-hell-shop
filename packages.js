// Coin top-up packages. baseCoins = price × 200 (the Starter rate, no bonus).
// bonusCoins = the extra coins bigger packages include, shown separately in the UI
// the way online shops do it ("2,000 +250 Bonus").
const PACKAGES = {
  starter: { id: 'starter', label: 'Starter', priceEur: 5.00, baseCoins: 1000, bonusCoins: 0, coins: 1000 },
  standard: { id: 'standard', label: 'Standard', priceEur: 10.00, baseCoins: 2000, bonusCoins: 250, coins: 2250 },
  booster: { id: 'booster', label: 'Booster', priceEur: 15.00, baseCoins: 3000, bonusCoins: 400, coins: 3400 },
  premium: { id: 'premium', label: 'Premium', priceEur: 25.00, baseCoins: 5000, bonusCoins: 750, coins: 5750 },
  ultimate: { id: 'ultimate', label: 'Ultimate', priceEur: 44.90, baseCoins: 9000, bonusCoins: 1500, coins: 10500 },
};

module.exports = { PACKAGES };
