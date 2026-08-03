// "News" feed shown on the Shop's Home tab — for announcements, events, or
// anything else worth calling out from the Shop or Discord. Newest first.
// To add a new one, add a new object to the TOP of this array.
//
// This is separate from changelog.js (which is specifically about new Shop
// features/reworks) — use this one for community news: events, milestones,
// giveaways, map votes, etc.
const NEWS = [
  {
    date: '2026-08-03',
    emoji: '💸',
    title: 'New: Quick Sell your items',
    description: "Don't wanna redeem your item? You can now quick sell it for 50% of it's value - go check it out!",
  },
  {
    date: '2026-08-01',
    emoji: '🎉',
    title: 'Welcome to the new Spotlight page!',
    description: 'Check out the Hall of Fame, Lucky Wheel wins, and VIP Showcase on the Spotlight tab.',
  },
];

module.exports = { NEWS };
