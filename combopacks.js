// Combo Packs — bundled deals combining multiple items at a discount.
// Pricing formula: sum of the component items' normal catalog prices, minus 30%,
// then rounded to a clean number. Sorted ascending by price.
const COMBO_PACKS = [
  {
    id: 'combo_starter',
    name: 'Starter Combo',
    image: '/images/groups/combo.jpg',
    // 250x Kibble Set (1800) + 2 Breedpairs (900) + 5 Blueprints (800) = 3500 → -30% = 2450 → rounded
    cost: 2500,
    contents: [
      '250x Kibble Set',
      '2 Breedpairs',
      '5 Blueprints of choice',
    ],
  },
  {
    id: 'combo_base',
    name: 'Base Combo',
    image: '/images/groups/combo.jpg',
    // 200x Base Kit (1800) + 4 Dedi Boxes (2000) + 4 Dino Color Tokens (1200) = 5000 → -30%
    cost: 3500,
    contents: [
      '200x Foundation/Wall/Ceiling + 1x Tek Generator + 200x Element',
      '4 Dedicated Storage Boxes of choice',
      '4 Dino Color Tokens',
    ],
  },
  {
    id: 'combo_dino',
    name: 'Dino Combo',
    image: '/images/groups/combo.jpg',
    // 8 Breedpairs (2300) + 500 Health Potion Kit (1700) + 8 Dino Color Tokens (2000) + 5 Blueprints (800) = 6800 → -30% = 4760 → rounded
    cost: 4800,
    contents: [
      '8 Breedpairs',
      '500x Health Potion Kit (Potent/Alpha/Mythic/Nightmare)',
      '8 Dino Color Tokens',
      '5 Blueprints of choice',
    ],
  },
  {
    id: 'combo_endgame',
    name: 'Endgame Combo',
    image: '/images/groups/combo.jpg',
    // 500x Kibble Set (2600) + 8 Breedpairs (2300) + 15 Blueprints (2000) + Instant Ascension (2500) = 9400 → -30% = 6580 → rounded
    cost: 6500,
    contents: [
      '500x Kibble Set',
      '8 Breedpairs',
      '15 Blueprints of choice',
      'Instant Ascension → Level 180',
    ],
  },
];

function findCombo(comboId) {
  return COMBO_PACKS.find((c) => c.id === comboId) || null;
}

module.exports = { COMBO_PACKS, findCombo };
