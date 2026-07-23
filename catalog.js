// Fixed-price shop catalog (NOT random — guaranteed item for a fixed coin cost).
// Prices derived from the README's EUR reference prices at ~160 coins/€, rounded.
const CATALOG = {
  kibble: {
    label: 'Kibble Set',
    emoji: '🍖',
    image: '/images/items/kibble.jpg',
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
    note: 'The dino must be breedable and tameable.',
    tiers: [
      { id: 'breedpairs_2', name: '2 Breedpairs', cost: 900 },
      { id: 'breedpairs_4', name: '4 Breedpairs', cost: 1600 },
      { id: 'breedpairs_8', name: '8 Breedpairs', cost: 2300 },
    ],
  },
  bpset: {
    label: 'Blueprints of Choice',
    emoji: '📜',
    image: '/images/items/bpset.jpg',
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
    tiers: [
      { id: 'healthkit_100', name: '100x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 700 },
      { id: 'healthkit_250', name: '250x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 1200 },
      { id: 'healthkit_500', name: '500x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)', cost: 1700 },
    ],
  },
  nightmareToken: {
    label: 'Nightmare Token',
    emoji: '💀',
    image: '/images/items/nightmare_token.jpg',
    note: 'Redeemable for any Nightmare Dino in the game.',
    tiers: [
      { id: 'nightmare_token', name: 'Nightmare Token', cost: 2000 },
    ],
  },
  originToken: {
    label: 'Origin Token',
    emoji: '🔮',
    image: '/images/items/origin_token.jpg',
    note: 'Redeemable for any Origin Dino in the game.',
    tiers: [
      { id: 'origin_token', name: 'Origin Token', cost: 1500 },
    ],
  },
  ascension: {
    label: 'Instant Ascension',
    emoji: '🚀',
    image: '/images/items/ascension.jpg',
    tiers: [
      { id: 'ascension_full', name: 'Instant Ascension → Level 180', cost: 2500 },
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
