// "News" feed shown on the Shop's Home tab — for announcements, events, or
// anything else worth calling out from the Shop or Discord. Newest first.
// To add a new one, add a new object to the TOP of this array.
//
// Rule: this file is for new PURCHASABLE ITEMS in the Shop (new boss reward,
// new item pack, new chest tier) and community announcements/events. New
// FUNCTIONALITY (a new command, a new mechanic, a UI rework) goes in
// changelog.js instead, not here.
const NEWS = [
  {
    date: '2026-08-04',
    emoji: '🛡️',
    title: 'New in the Shop: Base Defense Package',
    description: 'New 3-tier item pack — Tek Turrets, Heavy Turrets, Element Shards, Advanced Bullets, a Tek Generator, and Tek Structures, all in one purchase.',
  },
  {
    date: '2026-08-03',
    emoji: '🟣',
    title: 'New in the Shop: Mastercontroller Ascension',
    description: 'New individual boss reward added to Ascension — +15 Levels, same as the others.',
  },
  {
    date: '2026-08-02',
    emoji: '💜',
    title: 'New in the Shop: Rockwell Gen2 Ascension',
    description: 'New individual boss reward added to Ascension — same +15 Levels as the others.',
  },
];

module.exports = { NEWS };
