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
  xpparty: '/images/items/xppotions.jpg',
  originToken: '/images/items/origin_token.jpg',
  nightmareToken: '/images/items/nightmare_token.jpg',
};

// Every Origin/Nightmare-capable dino — used by both the Origin Chest and the
// Nightmare Chest pools below (equal odds per dino in each chest).
const ORIGIN_NIGHTMARE_DINOS = [
  'Argentavis', 'Carnotaurus', 'Dire Bear', 'Dodo Reaper', 'Kairuku',
  'Raptor', 'Rex', 'Spino', 'Triceratops', 'Wyvern', 'Yutyrannus',
];

// Dino pools for the Flyer / Non-Flyer / Water chests — "cool" dinos only,
// no small/filler creatures (Dilophosaur, drones, etc.). Equal odds each.
// Names are prefixed with their chaos tier since several dinos have multiple
// tiered versions in the mod (e.g. Toxic/Alpha/Fabled/Legendary/Mythic Pteranodon).
// NOTE: Griffin only shows up in the reference data as its Fairy-tier chaos
// variant "Grifficorn" — flag if that's wrong and the plain Griffin should be used.
const FLYER_DINOS = [
  'Alpha Argentavis', 'Alpha Pteranodon', 'Alpha Quetzal', 'Alpha Tapejara',
  'Fabled Argentavis', 'Fabled Pteranodon', 'Fabled Quetzal', 'Fabled Tapejara',
  'Fairy Grifficorn', 'Fairy Wyvern',
  'Legendary Pteranodon', 'Legendary Wyvern',
  'Mythic Argentavis', 'Mythic Pteranodon', 'Mythic Quetzal', 'Mythic Tapejara',
  'Toxic Argentavis', 'Toxic Pteranodon', 'Toxic Quetzal', 'Toxic Tapejara',
];
const NON_FLYER_DINOS = [
  'Alpha Allosaurus', 'Alpha Baryonyx', 'Alpha Carcharodontosaurus', 'Alpha Carnotaurus',
  'Alpha Giganotosaurus', 'Alpha Megalosaurus', 'Alpha Rex', 'Alpha Spino',
  'Alpha Therizinosaurus', 'Alpha Yutyrannus',
  'Fabled Therizinosaurus',
  'Legendary Allosaurus', 'Legendary Baryonyx', 'Legendary Carnotaurus',
  'Legendary Indominus Rex', 'Legendary Spino', 'Legendary Thorny Dragon',
  'Mythic Therizinosaurus',
  'Toxic Allosaurus', 'Toxic Baryonyx', 'Toxic Carcharodontosaurus', 'Toxic Carnotaurus',
  'Toxic Giganotosaurus', 'Toxic Megalosaurus', 'Toxic Rex', 'Toxic Spino',
  'Toxic Therizinosaurus', 'Toxic Yutyrannus',
];
// Only the Alpha tier list included water creatures in the reference data —
// let me know if Toxic/Fabled/Legendary/Mythic also have water variants.
const WATER_DINOS = [
  'Alpha Basilosaurus', 'Alpha Dunkleosteus', 'Alpha Liopleurodon', 'Alpha Megalodon',
  'Alpha Mosasaurus', 'Alpha Plesiosaur', 'Alpha Tusoteuthis',
];

const CHESTS = {
  tier1: {
    id: 'tier1',
    label: 'Tier 1 Chest',
    cost: 800,
    image: '/images/chest-tier1.jpg',
    color: 'gold',
    category: 'tier',
    pool: [
      { name: '2 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 18 },
      { name: '5 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 18 },
      { name: '100x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 18 },
      { name: '100x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 15 },
      { name: '100x XP Potion Set', emoji: '⭐', image: IMG.xpparty, weight: 15 },
      { name: '2 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 15 },
      { name: '100x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 100x Element', emoji: '⚡', image: IMG.basekit, weight: 7 },
    ],
  },
  tier2: {
    id: 'tier2',
    label: 'Tier 2 Chest',
    cost: 1600,
    image: '/images/chest-tier2.jpg',
    color: 'purple',
    category: 'tier',
    pool: [
      { name: '4 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 18 },
      { name: '10 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 18 },
      { name: '250x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 16 },
      { name: '250x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 14 },
      { name: '250x XP Potion Set', emoji: '⭐', image: IMG.xpparty, weight: 14 },
      { name: '4 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 13 },
      { name: '250x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 250x Element', emoji: '⚡', image: IMG.basekit, weight: 8 },
      { name: 'Ascension Pack', emoji: '🚀', image: IMG.ascension, weight: 2 },
    ],
  },
  tier3: {
    id: 'tier3',
    label: 'Tier 3 Chest',
    cost: 2400,
    image: '/images/chest-tier3.jpg',
    color: 'red',
    category: 'tier',
    pool: [
      { name: '8 Breedpairs', emoji: '🥚', image: IMG.breedpairs, weight: 17 },
      { name: '15 Blueprints of choice', emoji: '📜', image: IMG.bpset, weight: 17 },
      { name: '500x Kibble Set', emoji: '🍖', image: IMG.kibble, weight: 14 },
      { name: '500x Health Potion Kit', emoji: '🧪', image: IMG.healthkit, weight: 13 },
      { name: '500x XP Potion Set', emoji: '⭐', image: IMG.xpparty, weight: 13 },
      { name: '7 Dedicated Storage Boxes of choice', emoji: '📦', image: IMG.dedi, weight: 15 },
      { name: '350x Tek Foundation/Wall/Ceiling + 1x Tek Generator + 350x Element', emoji: '⚡', image: IMG.basekit, weight: 12 },
      { name: 'Ascension Pack', emoji: '🚀', image: IMG.ascension, weight: 10 },
    ],
  },
  origin: {
    id: 'origin',
    label: 'Origin Chest',
    cost: 1200,
    image: '/images/chest-origin.jpg',
    color: 'origin',
    category: 'dino',
    pool: ORIGIN_NIGHTMARE_DINOS.map((name) => ({
      name: `${name} (Origin)`, emoji: '🔮', image: IMG.originToken, weight: 1,
    })),
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare Chest',
    cost: 1700,
    image: '/images/chest-nightmare.jpg',
    color: 'nightmare',
    category: 'dino',
    pool: ORIGIN_NIGHTMARE_DINOS.map((name) => ({
      name: `${name} (Nightmare)`, emoji: '💀', image: IMG.nightmareToken, weight: 1,
    })),
  },
  flyer: {
    id: 'flyer',
    label: 'Flyer Chest',
    cost: 400,
    image: '/images/chest-flyer.jpg',
    color: 'flyer',
    category: 'dino',
    pool: FLYER_DINOS.map((name) => ({ name, emoji: '🦅', image: null, weight: 1 })),
  },
  nonflyer: {
    id: 'nonflyer',
    label: 'Non-Flyer Chest',
    cost: 400,
    image: '/images/chest-nonflyer.jpg',
    color: 'land',
    category: 'dino',
    pool: NON_FLYER_DINOS.map((name) => ({ name, emoji: '🦖', image: null, weight: 1 })),
  },
  water: {
    id: 'water',
    label: 'Water Chest',
    cost: 400,
    image: '/images/chest-water.jpg',
    color: 'water',
    category: 'dino',
    pool: WATER_DINOS.map((name) => ({ name, emoji: '🌊', image: null, weight: 1 })),
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
