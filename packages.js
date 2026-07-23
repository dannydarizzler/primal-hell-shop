// Zentrale Quelle für alle Coin-Pakete.
// Preise/Coins hier ändern -> wirkt sich überall aus (Server validiert IMMER gegen diese Liste).
const PACKAGES = {
  starter: { id: 'starter', label: 'Starter', priceEur: 5.00, coins: 1000 },
  standard: { id: 'standard', label: 'Standard', priceEur: 10.00, coins: 2250 },
  premium: { id: 'premium', label: 'Premium', priceEur: 25.00, coins: 5750 },
  ultimate: { id: 'ultimate', label: 'Ultimate', priceEur: 44.90, coins: 10500 },
};

module.exports = { PACKAGES };
