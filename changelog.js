// "New Features" feed shown on the Shop's Home tab, for transparency about
// recent changes. Newest entry first. To add a new one, just add a new object
// to the TOP of this array — no other code changes needed.
//
// Keep it to genuinely player-facing changes (new features, reworks, new
// items) — skip small internal fixes/bugfixes that don't change what players
// see or do.
const CHANGELOG = [
  {
    date: '2026-08-03',
    emoji: '💸',
    title: 'Quick Sell',
    description: "Don't want to redeem an item? Quick sell it from My Items for 50% of its price back in Coins, instantly.",
  },
  {
    date: '2026-08-02',
    emoji: '💜',
    title: 'Rockwell Gen2 Boss Reward',
    description: 'New individual boss reward added to Ascension — same +15 Levels as the others.',
  },
  {
    date: '2026-08-01',
    emoji: '🏆',
    title: 'Spotlight Page Overhaul',
    description: 'Top 5 now shown as a real podium, plus new Hall of Fame, Biggest Lucky Wheel Win, VIP Showcase, and Live Activity widgets.',
  },
  {
    date: '2026-08-01',
    emoji: '🎖️',
    title: 'Profile Badges',
    description: 'Earn badges for your Discord activity rank, VIP status, and special achievements — shown on your Profile tab.',
  },
  {
    date: '2026-08-01',
    emoji: '📊',
    title: 'New /rank Command',
    description: 'Get a personal visual rank card right in Discord — your rank, your server placement, and your progress to the next tier.',
  },
  {
    date: '2026-07-31',
    emoji: '🎁',
    title: 'Combo Deals in Chests',
    description: 'Combo Packs can now drop directly from Mystery Chests, not just be bought outright.',
  },
  {
    date: '2026-07-31',
    emoji: '🔄',
    title: 'Full Drop Rework',
    description: 'All Supply Crate contents rebalanced across every color, plus a new Deep-Sea crate exclusive to Ragnarok.',
  },
];

module.exports = { CHANGELOG };
