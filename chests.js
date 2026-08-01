// Mystery Box / Chest tiers. Weights are placeholders for now — fine-tune later.
// Each tier draws exactly ONE item from its own pool.

const { COMBO_PACKS } = require('./combopacks');

// Shared item images (falls back to emoji-only if no image is set, e.g. Origin Sets/Tokens).
const IMG = {
  breedpairs: '/images/items/breedpairs.jpg',
  bpset: '/images/items/bpset.jpg',
  kibble: '/images/items/kibble.jpg',
  dedi: '/images/items/dedibox.jpg',
  basekit: '/images/items/basekit.jpg',
  fullAscension: '/images/items/fullascension.jpg',
  manticore: '/images/items/manticore.jpg',
  overseer: '/images/items/overseer.jpg',
  rockwell: '/images/items/rockwell.jpg',
  extinction: '/images/items/extinction.jpg',
  healthkit: '/images/items/healthpotions.jpg',
  xpparty: '/images/items/xppotions.jpg',
  originToken: '/images/items/origin_token.jpg',
  nightmareToken: '/images/items/nightmare_token.jpg',
};

// COMBO_PACKS sorted ascending by cost — used to pick "the cheapest" / "the two
// cheapest" combo deals for the tier 1 / tier 2 chest pools below.
const COMBOS_BY_PRICE = [...COMBO_PACKS].sort((a, b) => a.cost - b.cost);

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
// NOTE on assumptions — flag if any of these are wrong:
// - "Grifficorn" (Fairy) and "Argycorn" (Fairy) are treated as the Fairy-tier
//   chaos variants of Griffin/Argentavis (matching the Doedicorn/Jerboacorn
//   naming pattern). Griffin also has its own literal "Griffin" entry in the
//   Electric tier, which is kept as a separate, un-renamed entry.
// - "Ptera" in the Volcanic list was NOT matched to Pteranodon since it reads
//   as a distinct/truncated entry — let me know if it should be added.
const FLYER_DINOS = [
  'Alpha Argentavis', 'Alpha Pteranodon', 'Alpha Quetzal', 'Alpha Tapejara',
  'Electric Argentavis', 'Electric Dragon', 'Electric Griffin',
  'Fabled Argentavis', 'Fabled Pteranodon', 'Fabled Quetzal', 'Fabled Tapejara',
  'Fairy Argycorn', 'Fairy Grifficorn', 'Fairy Pegasus', 'Fairy Wyvern',
  'Hydro Dragon',
  'Legendary Pteranodon', 'Legendary Wyvern',
  'Mythic Argentavis', 'Mythic Pteranodon', 'Mythic Quetzal', 'Mythic Tapejara',
  'Toxic Argentavis', 'Toxic Pteranodon', 'Toxic Quetzal', 'Toxic Tapejara',
  'Volcanic Dragon', 'Volcanic Tapejara', 'Volcanic Wyvern',
];
const NON_FLYER_DINOS = [
  'Alpha Allosaurus', 'Alpha Baryonyx', 'Alpha Carcharodontosaurus', 'Alpha Carnotaurus',
  'Alpha Giganotosaurus', 'Alpha Megalosaurus', 'Alpha Rex', 'Alpha Spino',
  'Alpha Therizinosaurus', 'Alpha Yutyrannus',
  'Electric Allosaurus', 'Electric Dodo Rex', 'Electric Rex',
  'Fabled Therizinosaurus',
  'Hydro Allosaurus', 'Hydro Baryonyx', 'Hydro Rex', 'Hydro Spino',
  'Legendary Allosaurus', 'Legendary Baryonyx', 'Legendary Carnotaurus',
  'Legendary Indominus Rex', 'Legendary Spino', 'Legendary Thorny Dragon',
  'Mythic Therizinosaurus',
  'Toxic Allosaurus', 'Toxic Baryonyx', 'Toxic Carcharodontosaurus', 'Toxic Carnotaurus',
  'Toxic Giganotosaurus', 'Toxic Megalosaurus', 'Toxic Rex', 'Toxic Spino',
  'Toxic Therizinosaurus', 'Toxic Yutyrannus',
  'Volcanic Allosaurus', 'Volcanic Dodo Rex', 'Volcanic Rex', 'Volcanic Spino',
];
const WATER_DINOS = [
  'Alpha Basilosaurus', 'Alpha Dunkleosteus', 'Alpha Megalodon',
  'Alpha Mosasaurus', 'Alpha Plesiosaur', 'Alpha Tusoteuthis',
  'Electric Basilosaurus', 'Electric Dunkleosteus', 'Electric Megalodon',
  'Electric Mosasaurus', 'Electric Plesiosaur', 'Electric Tusoteuthis',
  'Hydro Basilosaurus', 'Hydro Dunkleosteus', 'Hydro Megalodon',
  'Hydro Mosasaurus', 'Hydro Plesiosaur', 'Hydro Tusoteuthis',
  'Volcanic Basilosaurus', 'Volcanic Dunkleosteus', 'Volcanic Megalodon',
  'Volcanic Mosasaurus', 'Volcanic Plesiosaur', 'Volcanic Tusoteuthis',
];

// Angelic/Demonic Chest — every dino from both lists, tier-prefixed.
const ANGELIC_DINOS = [
  'Allosaurus', 'Argentavis', 'Dire Bear', 'Direwolf', 'Griffin', 'Manticore',
  'Pegasus', 'Rex', 'Spino', 'Therizinosaur', 'Thylacoleo', 'Wyvern', 'Yutyrannus',
];
const DEMONIC_DINOS = [
  'Bulbdog', 'Dilophosaur', 'Dodo', 'Equus', 'Ferox', 'Glowtail', 'Gorilla',
  'Hyaenodon', 'Kaprosuchus', 'Megatherium', 'Mesopithecus', 'Ovis', 'Parasaur',
  'Reaper Queen', 'Shinehorn', 'Thorny Dragon',
];

// Spirit Chaos Chest — every dino from both lists, tier-prefixed.
const SPIRIT_DINOS = [
  'Brontosaurus', 'Carnotaurus', 'Dodo Rex', 'Giganotosaurus', 'Indominus Rex',
  'Jerboa', 'Quetzal', 'Raptor', 'Rex', 'Stegosaurus', 'Triceratops', 'Wyvern',
];
const CHAOS_DINOS = [
  'Dodo Rex', 'Griffin', 'Indominus Rex', 'Rex', 'Rockdrake', 'Spino',
  'Therizinosaur', 'Thylacoleo', 'Wyvern',
];

const CHESTS = {
  tier1: {
    id: 'tier1',
    label: 'Tier 1 Chest',
    cost: 900,
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
      { name: '100x Tek Structures + 1x Tek Generator + 100x Element', emoji: '⚡', image: IMG.basekit, weight: 7 },
      { name: 'Manticore Reward (+15 Levels)', emoji: '🦁', image: IMG.manticore, weight: 5 },
      { name: 'Overseer Reward (+15 Levels)', emoji: '👁️', image: IMG.overseer, weight: 5 },
      { name: 'Rockwell Reward (+15 Levels)', emoji: '🧟', image: IMG.rockwell, weight: 5 },
      { name: 'Extinction Reward (+15 Levels)', emoji: '☠️', image: IMG.extinction, weight: 5 },
      // Cheapest combo deal only, ~1% chance (weight 1 in a pool totalling 127 → 0.79%).
      { name: COMBOS_BY_PRICE[0].name, emoji: '🎁', image: COMBOS_BY_PRICE[0].image, weight: 1 },
    ],
  },
  tier2: {
    id: 'tier2',
    label: 'Tier 2 Chest',
    cost: 1800,
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
      { name: '250x Tek Structures + 1x Tek Generator + 250x Element', emoji: '⚡', image: IMG.basekit, weight: 8 },
      { name: 'Manticore Reward (+15 Levels)', emoji: '🦁', image: IMG.manticore, weight: 6 },
      { name: 'Overseer Reward (+15 Levels)', emoji: '👁️', image: IMG.overseer, weight: 6 },
      { name: 'Rockwell Reward (+15 Levels)', emoji: '🧟', image: IMG.rockwell, weight: 6 },
      { name: 'Extinction Reward (+15 Levels)', emoji: '☠️', image: IMG.extinction, weight: 6 },
      // Two cheapest combo deals, ~1% chance each (weight 1 each in a pool totalling 127 → 0.79% each).
      { name: COMBOS_BY_PRICE[0].name, emoji: '🎁', image: COMBOS_BY_PRICE[0].image, weight: 1 },
      { name: COMBOS_BY_PRICE[1].name, emoji: '🎁', image: COMBOS_BY_PRICE[1].image, weight: 1 },
    ],
  },
  tier3: {
    id: 'tier3',
    label: 'Tier 3 Chest',
    cost: 2600,
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
      { name: '350x Tek Structures + 1x Tek Generator + 350x Element', emoji: '⚡', image: IMG.basekit, weight: 12 },
      { name: 'Full Ascension', emoji: '🚀', image: IMG.fullAscension, weight: 10 },
      // All 5 combo packs, ~1% chance each (weight 1 each in a pool totalling 116 → 0.86% each).
      ...COMBO_PACKS.map((combo) => ({
        name: combo.name, emoji: '🎁', image: combo.image, weight: 1,
      })),
    ],
  },
  origin: {
    id: 'origin',
    label: 'Origin Chest',
    cost: 1900,
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
    cost: 2200,
    image: '/images/chest-nightmare.jpg',
    color: 'nightmare',
    category: 'dino',
    // Dino weight rescaled from 1 to 90 each (still equal odds among themselves)
    // so the 5 combo deals below can slot in at a clean ~1% each: 11×90=990 dino
    // weight + 5×10=50 combo weight = 1040 total → each combo = 10/1040 ≈ 0.96%.
    pool: [
      ...ORIGIN_NIGHTMARE_DINOS.map((name) => ({
        name: `${name} (Nightmare)`, emoji: '💀', image: IMG.nightmareToken, weight: 90,
      })),
      ...COMBO_PACKS.map((combo) => ({
        name: combo.name, emoji: '🎁', image: combo.image, weight: 10,
      })),
    ],
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
  angelicdemonic: {
    id: 'angelicdemonic',
    label: 'Angelic/Demonic Chest',
    cost: 600,
    image: '/images/chest-angelicdemonic.jpg',
    color: 'angelicdemonic',
    category: 'dino',
    pool: [
      ...ANGELIC_DINOS.map((name) => ({ name: `Angelic ${name}`, emoji: '👼', image: null, weight: 1 })),
      ...DEMONIC_DINOS.map((name) => ({ name: `Demonic ${name}`, emoji: '😈', image: null, weight: 1 })),
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },
  spiritchaos: {
    id: 'spiritchaos',
    label: 'Spirit/Chaos Chest',
    cost: 1000,
    image: '/images/chest-spiritchaos.jpg',
    color: 'spiritchaos',
    category: 'dino',
    pool: [
      ...SPIRIT_DINOS.map((name) => ({ name: `Spirit ${name}`, emoji: '👻', image: null, weight: 1 })),
      ...CHAOS_DINOS.map((name) => ({ name: `Chaos ${name}`, emoji: '⚔️', image: null, weight: 1 })),
    ].sort((a, b) => a.name.localeCompare(b.name)),
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
