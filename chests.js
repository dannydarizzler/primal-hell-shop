// Mystery Box / Chest tiers. Weights are placeholders for now — fine-tune later.
// Each tier draws exactly ONE item from its own pool.
const CHESTS = {
  tier1: {
    id: 'tier1',
    label: 'Tier 1 Chest',
    cost: 900,
    image: '/images/chest-tier1.jpg',
    color: 'gold',
    pool: [
      { name: '2 Breedpairs', emoji: '🥚', weight: 20 },
      { name: '5 Blueprints of choice', emoji: '📜', weight: 20 },
      { name: '100x Kibble Set', emoji: '🍖', weight: 20 },
      { name: '1x Origin Set (11 Tokens + 11 Blood)', emoji: '🔮', weight: 15 },
      { name: '2 Dedicated Storage Boxes of choice', emoji: '📦', weight: 15 },
      { name: '100x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 100x Element', emoji: '⚡', weight: 10 },
    ],
  },
  tier2: {
    id: 'tier2',
    label: 'Tier 2 Chest',
    cost: 1600,
    image: '/images/chest-tier2.jpg',
    color: 'purple',
    pool: [
      { name: '4 Breedpairs', emoji: '🥚', weight: 20 },
      { name: '10 Blueprints of choice', emoji: '📜', weight: 20 },
      { name: '250x Kibble Set', emoji: '🍖', weight: 18 },
      { name: '2x Origin Set (22 Tokens + 22 Blood)', emoji: '🔮', weight: 15 },
      { name: '4 Dedicated Storage Boxes of choice', emoji: '📦', weight: 12 },
      { name: '250x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 250x Element', emoji: '⚡', weight: 10 },
      { name: 'Instant Ascension → Level 180', emoji: '🚀', weight: 5 },
    ],
  },
  tier3: {
    id: 'tier3',
    label: 'Tier 3 Chest',
    cost: 2500,
    image: '/images/chest-tier3.jpg',
    color: 'red',
    pool: [
      { name: '8 Breedpairs', emoji: '🥚', weight: 18 },
      { name: '15 Blueprints of choice', emoji: '📜', weight: 18 },
      { name: '500x Kibble Set', emoji: '🍖', weight: 16 },
      { name: '3x Origin Set (33 Tokens + 33 Blood)', emoji: '🔮', weight: 14 },
      { name: '7 Dedicated Storage Boxes of choice', emoji: '📦', weight: 12 },
      { name: '350x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 350x Element', emoji: '⚡', weight: 12 },
      { name: 'Instant Ascension → Level 180', emoji: '🚀', weight: 10 },
    ],
  },
};

function drawFromChest(tierId) {
  const chest = CHESTS[tierId];
  if (!chest) return null;

  const totalWeight = chest.pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of chest.pool) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return chest.pool[chest.pool.length - 1]; // fallback (floating point safety)
}

module.exports = { CHESTS, drawFromChest };
