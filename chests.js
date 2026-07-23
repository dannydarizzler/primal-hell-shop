// Mystery Box / Chest tiers. Weights are placeholders for now — fine-tune later.
// Each tier draws exactly ONE item from its own pool.

// Shared item images (falls back to emoji-only if no image is set, e.g. Origin Sets/Tokens).
const IMG = {
  breedpairs: '/images/items/breedpairs.jpg',
  bpset: '/images/items/bpset.jpg',
  kibble: '/images/items/kibble.jpg',
  dedi: '/images/items/dedibox.jpg',
  basekit: '/images/items/basekit.jpg',
  ascension: '/images/items/ascension.jpg',
  healthkit: '/images/items/healthpotions.jpg',
};

// Every Origin/Nightmare-capable dino — used by both the Origin Chest and the
// Nightmare Chest pools below (equal odds per dino in each chest).
const ORIGIN_NIGHTMARE_DINOS = [
  'Argentavis', 'Carnotaurus', 'Dire Bear', 'Dodo Reaper', 'Kairuku',
  'Raptor', 'Rex', 'Spino', 'Triceratops', 'Wyvern', 'Yutyrannus',
];

const CHESTS = {
  tier1: {
    id: 'tier1',
    label: 'Tier 1 Chest',
    cost: 900,
    image: '/images/chest-tier1.jpg',
    color: 'gold',
    pool: [
      { name: '2 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 18 },
      { name: '5 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 18 },
      { name: '100x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 18 },
      { name: '100x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 15 },
      { name: '1x Origin Set (11 Tokens + 11 Blood)', emoji: '🔮', image: null, weight: 12 },
      { name: '2 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 12 },
      { name: '100x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 100x Element', emoji: '⚡', image: IMG.basekit, weight: 7 },
    ],
  },
  tier2: {
    id: 'tier2',
    label: 'Tier 2 Chest',
    cost: 1600,
    image: '/images/chest-tier2.jpg',
    color: 'purple',
    pool: [
      { name: '4 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 18 },
      { name: '10 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 18 },
      { name: '250x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 16 },
      { name: '250x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 14 },
      { name: '2x Origin Set (22 Tokens + 22 Blood)', emoji: '🔮', image: null, weight: 13 },
      { name: '4 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 11 },
      { name: '250x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 250x Element', emoji: '⚡', image: IMG.basekit, weight: 8 },
      { name: 'Instant Ascension → Level 180', emoji: '🚀', image: IMG.ascension, weight: 2 },
    ],
  },
  tier3: {
    id: 'tier3',
    label: 'Tier 3 Chest',
    cost: 2500,
    image: '/images/chest-tier3.jpg',
    color: 'red',
    pool: [
      { name: '8 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 17 },
      { name: '15 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 17 },
      { name: '500x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 14 },
      { name: '500x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 13 },
      { name: '7 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 15 },
      { name: '350x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 350x Element', emoji: '⚡', image: IMG.basekit, weight: 12 },
      { name: 'Instant Ascension → Level 180', emoji: '🚀', image: IMG.ascension, weight: 10 },
    ],
  },
  origin: {
    id: 'origin',
    label: 'Origin Chest',
    cost: 1200,
    image: '/images/chest-origin.jpg',
    color: 'origin',
    pool: ORIGIN_NIGHTMARE_DINOS.map((name) => ({
      name: `${name} (Origin)`, emoji: '🔮', image: null, weight: 1,
    })),
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare Chest',
    cost: 1700,
    image: '/images/chest-nightmare.jpg',
    color: 'nightmare',
    pool: ORIGIN_NIGHTMARE_DINOS.map((name) => ({
      name: `${name} (Nightmare)`, emoji: '💀', image: null, weight: 1,
    })),
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
