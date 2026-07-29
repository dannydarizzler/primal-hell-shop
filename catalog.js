// Fixed-price shop catalog (NOT random — guaranteed item for a fixed coin cost).
// Every category has a `group` field used to sort it into the right Shop
// sub-section: 'single' (the classic Tier 1/2/3 items), 'cosmetics',
// 'chaosDinos', or 'bossFights'.
const CATALOG = {
  kibble: {
    label: 'Kibble Set',
    emoji: '🍖',
    image: '/images/items/kibble.jpg',
    group: 'single',
    note: 'Chaos & Spirit Kibble count as 5 — a 100x set yields 20 Chaos/Spirit Kibble. Demonic & Angelic Kibble count as 2 — a 100x set yields 50 Demonic/Angelic Kibble.',
    tiers: [
      { id: 'kibble_100', name: '100x Kibble Set', cost: 1000 },
      { id: 'kibble_250', name: '250x Kibble Set', cost: 1800 },
      { id: 'kibble_500', name: '500x Kibble Set', cost: 2600 },
    ],
  },
  basekit: {
    label: 'Base Kit',
    emoji: '⚡',
    image: '/images/items/basekit.jpg',
    group: 'single',
    tiers: [
      { id: 'basekit_100', name: '100x Foundation/Wall/Ceiling + 1x Tek Generator + 100x Element', cost: 1000 },
      { id: 'basekit_200', name: '200x Foundation/Wall/Ceiling + 1x Tek Generator + 200x Element', cost: 1800 },
      { id: 'basekit_500', name: '500x Foundation/Wall/Ceiling + 1x Tek Generator + 500x Element', cost: 2600 },
    ],
  },
  breedpairs: {
    label: 'Breedpairs',
    emoji: '🥚',
    image: '/images/items/breedpairs.jpg',
    group: 'single',
    note: 'The dino must be breedable and tameable. Nightmares, Origins, Spirits and Chaos Dinos are excluded and can only be obtained by Tokens or chests.',
    tiers: [
      { id: 'breedpairs_2', name: '2 Breedpairs', cost: 1500 },
      { id: 'breedpairs_4', name: '4 Breedpairs', cost: 2100 },
      { id: 'breedpairs_8', name: '8 Breedpairs', cost: 3200 },
    ],
  },
  bpset: {
    label: 'Blueprints of Choice',
    emoji: '📜',
    image: '/images/items/bpset.jpg',
    group: 'single',
    tiers: [
      { id: 'bpset_5', name: '5 Blueprints of choice', cost: 800 },
      { id: 'bpset_10', name: '10 Blueprints of choice', cost: 1400 },
      { id: 'bpset_15', name: '15 Blueprints of choice', cost: 2000 },
    ],
  },
  dedi: {
    label: 'Dedicated Storage Boxes',
    emoji: '📦',
    image: '/images/items/dedibox.jpg',
    group: 'single',
    note: 'Only vanilla resources can be purchased — no Chaos items or Element/Element Shards.',
    tiers: [
      { id: 'dedi_2', name: '2 Dedicated Storage Boxes of choice', cost: 1100 },
      { id: 'dedi_4', name: '4 Dedicated Storage Boxes of choice', cost: 2000 },
      { id: 'dedi_7', name: '7 Dedicated Storage Boxes of choice', cost: 2900 },
    ],
  },
  healthkit: {
    label: 'Health Potion Kit',
    emoji: '🧪',
    image: '/images/items/healthpotions.jpg',
    group: 'single',
    tiers: [
      { id: 'healthkit_100', name: '100x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 700 },
      { id: 'healthkit_250', name: '250x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 1200 },
      { id: 'healthkit_500', name: '500x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 1700 },
    ],
  },
  xpparty: {
    label: 'XP Party',
    emoji: '⭐',
    image: '/images/items/xppotions.jpg',
    group: 'single',
    tiers: [
      { id: 'xpparty_100', name: '100x XP Potion Set', cost: 800, note: 'Contains: 25 Max XP Potions, 25 Large XP Potions, 50 Medium XP Potions.' },
      { id: 'xpparty_250', name: '250x XP Potion Set', cost: 1300, note: 'Contains: 50 Max XP Potions, 100 Large XP Potions, 100 Medium XP Potions.' },
      { id: 'xpparty_500', name: '500x XP Potion Set', cost: 1800, note: 'Contains: 100 Max XP Potions, 400 Large XP Potions.' },
    ],
  },

  // ── Cosmetics ──────────────────────────────────────────────────────────────
  dinoColor: {
    label: 'Dino Color Token',
    emoji: '🌈',
    image: '/images/items/dinocolor.jpg',
    group: 'cosmetics',
    note: 'Redeemable for a custom color recolor on any dino of your choice.',
    tiers: [
      { id: 'dinocolor_1', name: '1 Dino Color Token', cost: 600 },
      { id: 'dinocolor_4', name: '4 Dino Color Tokens', cost: 1200 },
      { id: 'dinocolor_8', name: '8 Dino Color Tokens', cost: 2000 },
    ],
  },
  chibisRandom: {
    label: 'Chibis — Random',
    emoji: '🦖',
    image: '/images/items/chibi.jpg',
    group: 'cosmetics',
    note: 'Chibis are purely cosmetic companion pets. This pack gives random Chibis from the pool — no picking.',
    tiers: [
      { id: 'chibis_random_5', name: '5 Random Chibis', cost: 800 },
      { id: 'chibis_random_15', name: '15 Random Chibis', cost: 1400 },
      { id: 'chibis_random_30', name: '30 Random Chibis', cost: 2000 },
    ],
  },
  chibisChoice: {
    label: 'Chibis — Choice',
    emoji: '🦖',
    image: '/images/items/chibi_choice.jpg',
    group: 'cosmetics',
    note: 'Chibis are purely cosmetic companion pets. Pick exactly which Chibis you want — no randomness.',
    tiers: [
      { id: 'chibis_choice_1', name: '1 Chibi of choice', cost: 800 },
      { id: 'chibis_choice_2', name: '2 Chibis of choice', cost: 1400 },
      { id: 'chibis_choice_5', name: '5 Chibis of choice', cost: 2000 },
    ],
  },

  // ── Chaos Dinos ────────────────────────────────────────────────────────────
  nightmareToken: {
    label: 'Nightmare Token',
    emoji: '💀',
    image: '/images/items/nightmare_token.jpg',
    group: 'chaosDinos',
    note: 'Redeemable for any Nightmare Dino in the game.',
    tiers: [
      { id: 'nightmare_token', name: 'Nightmare Token', cost: 2200 },
    ],
  },
  originToken: {
    label: 'Origin Token',
    emoji: '🔮',
    image: '/images/items/origin_token.jpg',
    group: 'chaosDinos',
    note: 'Redeemable for any Origin Dino in the game.',
    tiers: [
      { id: 'origin_token', name: 'Origin Token', cost: 1700 },
    ],
  },
  spiritToken: {
    label: 'Spirit Token',
    emoji: '👻',
    image: '/images/items/spirit_token.jpg',
    group: 'chaosDinos',
    note: 'Redeemable for any Spirit Dino in the game.',
    tiers: [
      { id: 'spirit_token', name: 'Spirit Token', cost: 1200 },
    ],
  },
  chaosToken: {
    label: 'Chaos Token',
    emoji: '⚔️',
    image: '/images/items/chaos_token.jpg',
    group: 'chaosDinos',
    note: 'Redeemable for any Chaos Dino in the game.',
    tiers: [
      { id: 'chaos_token', name: 'Chaos Token', cost: 1200 },
    ],
  },

  // ── Boss Fights ────────────────────────────────────────────────────────────
  manticore: {
    label: 'Manticore Boss Reward',
    emoji: '🦁',
    image: '/images/items/manticore.jpg',
    group: 'bossFights',
    note: 'Grants +15 levels, as if you had defeated the Manticore boss fight.',
    tiers: [
      { id: 'manticore_15', name: 'Manticore Reward (+15 Levels)', cost: 750 },
    ],
  },
  overseer: {
    label: 'Overseer Boss Reward',
    emoji: '👁️',
    image: '/images/items/overseer.jpg',
    group: 'bossFights',
    note: 'Grants +15 levels, as if you had defeated the Overseer boss fight.',
    tiers: [
      { id: 'overseer_15', name: 'Overseer Reward (+15 Levels)', cost: 750 },
    ],
  },
  rockwell: {
    label: 'Rockwell Boss Reward',
    emoji: '🧟',
    image: '/images/items/rockwell.jpg',
    group: 'bossFights',
    note: 'Grants +15 levels, as if you had defeated the Rockwell boss fight.',
    tiers: [
      { id: 'rockwell_15', name: 'Rockwell Reward (+15 Levels)', cost: 750 },
    ],
  },
  ascensionPack: {
    label: 'Ascension Pack',
    emoji: '🚀',
    image: '/images/items/ascension.jpg',
    group: 'bossFights',
    note: 'Bundles all 3 individually-sellable boss rewards — Manticore + Overseer + Rockwell (+45 Levels total) — for 300 Coins less than buying them separately (2,250 → 1,950).',
    tiers: [
      { id: 'ascension_pack', name: 'Ascension Pack (+45 Levels — Manticore + Overseer + Rockwell)', cost: 1950 },
    ],
  },
};

function findTier(tierId) {
  for (const category of Object.values(CATALOG)) {
    const tier = category.tiers.find((t) => t.id === tierId);
    if (tier) return { category, tier };
  }
  return null;
}

module.exports = { CATALOG, findTier };
