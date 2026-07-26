// Combo Packs — bundled deals combining multiple items at a better price than
// buying everything separately. Prices/contents below are starter examples —
// adjust freely in this file (id must stay unique and stable once players can
// buy it, since purchases reference the id).
const COMBO_PACKS = [
  {
    id: 'combo_starter',
    name: 'Starter Combo',
    image: '/images/groups/combo.jpg',
    cost: 2400,
    contents: [
      '250x Kibble Set',
      '2 Breedpairs',
      '5 Blueprints of choice',
    ],
  },
  {
    id: 'combo_builder',
    name: 'Builder Combo',
    image: '/images/groups/combo.jpg',
    cost: 3200,
    contents: [
      '200x Foundation/Wall/Ceiling + 1x Tek Generator + 200x Element',
      '4 Dedicated Storage Boxes of choice',
    ],
  },
  {
    id: 'combo_endgame',
    name: 'Endgame Combo',
    image: '/images/groups/combo.jpg',
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
