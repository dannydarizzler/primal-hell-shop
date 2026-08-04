// Combo Packs — bundled deals combining multiple items at a discount.
// Pricing formula: sum of the component items' normal catalog prices, minus 25%,
// then rounded UP to the nearest clean number (nearest 100). Sorted ascending by price.
const COMBO_PACKS = [
  {
    id: 'combo_starter',
    name: 'Starter Combo',
    image: '/images/combos/starter.jpg',
    // 250x Kibble Set (1800) + 2 Breedpairs (1600) + 5 Blueprints (800) = 4200 → -25% = 3150 → rounded up
    cost: 3200,
    contents: [
      '250x Kibble Set',
      '2 Breedpairs',
      '5 Blueprints of choice',
    ],
  },
  {
    id: 'combo_dinos',
    name: 'Dinos Combo',
    image: '/images/combos/dinos.jpg',
    // 8 Breedpairs (3600) + Spirit Token (1400) + Chaos Token (1400) + 500x Health Potion Kit (1700) = 8100 → -25% = 6075 → rounded up
    cost: 6100,
    contents: [
      '8 Breedpairs',
      '1 Spirit Token',
      '1 Chaos Token',
      '500x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)',
    ],
  },
  {
    id: 'combo_gearup',
    name: 'Gear Up Combo',
    image: '/images/combos/gearup.jpg',
    // Vault Tier 3 (4000) + 500x Health Potion Kit (1700) + 250x XP Potion Set (1300) = 7000 → -25% = 5250 → rounded up
    cost: 5300,
    contents: [
      'Vault — Tier 3',
      '500x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)',
      '250x XP Potion Set',
    ],
  },
  {
    id: 'combo_base',
    name: 'Base Combo',
    image: '/images/combos/base.jpg',
    // Base Kit Tier 3 (3000) + 7 Dedi Boxes (2900) + Vault Tier 2 (3000) = 8900 → -25% = 6675 → rounded up
    cost: 6700,
    contents: [
      '2,000x Tek Structures + 3x Tek Generator + 500x Element + 3x Small Tek Teleporter + 3x Cloning Chamber + 1x Tek Replicator',
      '7 Dedicated Storage Boxes of choice',
      'Vault — Tier 2',
    ],
  },
  {
    id: 'combo_endgame',
    name: 'Endgame Combo',
    image: '/images/combos/endgame.jpg',
    // Full Ascension (4400) + 2 Nightmare Tokens (5000) + 500x XP Potion Set (1800) = 11200 → -25% = 8400 → rounded up
    cost: 8400,
    contents: [
      "Full Ascension (+115 Levels — All Boss Fights + Explorer Notes + Bob's Tales Explorer Notes)",
      '2 Nightmare Tokens',
      '500x XP Potion Set',
    ],
  },
];

function findCombo(comboId) {
  return COMBO_PACKS.find((c) => c.id === comboId) || null;
}

module.exports = { COMBO_PACKS, findCombo };
