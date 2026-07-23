// Fixed-price shop catalog (NOT random — guaranteed item for a fixed coin cost).
// Prices derived from the README's EUR reference prices at ~160 coins/€, rounded.
const CATALOG = {
  kibble: {
    label: 'Kibble Set',
    emoji: '🍖',
    image: '/images/items/kibble.jpg',
    tiers: [
      { id: 'kibble_100', name: '100x Kibble Set', cost: 950 },
      { id: 'kibble_250', name: '250x Kibble Set', cost: 1750 },
      { id: 'kibble_500', name: '500x Kibble Set', cost: 2550 },
    ],
  },
  basekit: {
    label: 'Base Kit',
    emoji: '⚡',
    image: '/images/items/basekit.jpg',
    tiers: [
      { id: 'basekit_100', name: '100x Foundation/Wall/Ceiling + 1x Tek Generator + 100x Element', cost: 1100 },
      { id: 'basekit_200', name: '200x Foundation/Wall/Ceiling + 1x Tek Generator + 200x Element', cost: 1450 },
      { id: 'basekit_500', name: '500x Foundation/Wall/Ceiling + 1x Tek Generator + 500x Element', cost: 4000 },
    ],
  },
  breedpairs: {
    label: 'Breedpairs',
    emoji: '🥚',
    image: '/images/items/breedpairs.jpg',
    tiers: [
      { id: 'breedpairs_2', name: '2 Breedpairs', cost: 800 },
      { id: 'breedpairs_4', name: '4 Breedpairs', cost: 1450 },
      { id: 'breedpairs_8', name: '8 Breedpairs', cost: 1900 },
    ],
  },
  bpset: {
    label: 'Blueprints of Choice',
    emoji: '📜',
    image: '/images/items/bpset.jpg',
    tiers: [
      { id: 'bpset_5', name: '5 Blueprints of choice', cost: 800 },
      { id: 'bpset_10', name: '10 Blueprints of choice', cost: 1450 },
      { id: 'bpset_15', name: '15 Blueprints of choice', cost: 2100 },
    ],
  },
  dedi: {
    label: 'Dedicated Storage Boxes',
    emoji: '📦',
    image: '/images/items/dedibox.jpg',
    tiers: [
      { id: 'dedi_2', name: '2 Dedicated Storage Boxes of choice', cost: 1100 },
      { id: 'dedi_4', name: '4 Dedicated Storage Boxes of choice', cost: 2100 },
      { id: 'dedi_7', name: '7 Dedicated Storage Boxes of choice', cost: 3000 },
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
