// Message-count tier progression — MUST stay in sync with TIER_ROLES in bot.py.
// The bot is the source of truth for role-assignment and reward amounts; this
// is only a display-side mirror so the shop can compute progress without
// needing a live connection to the bot.
const TIER_ROLES = [
  { name: 'Toxic', threshold: 10, reward: 100 },
  { name: 'Alpha', threshold: 20, reward: 200 },
  { name: 'Elemental', threshold: 40, reward: 400 },
  { name: 'Shadow', threshold: 80, reward: 800 },
  { name: 'Mythic', threshold: 160, reward: 1000 },
  { name: 'Demonic', threshold: 320, reward: 2000 },
  { name: 'Spirit', threshold: 640, reward: 4000 },
];

function computeTierProgress(messageCount) {
  let currentTier = null;
  let nextTier = null;

  for (const tier of TIER_ROLES) {
    if (messageCount >= tier.threshold) {
      currentTier = tier;
    } else {
      nextTier = tier;
      break;
    }
  }

  if (!nextTier) {
    return { messageCount, currentTier, nextTier: null, progressPercent: 100 };
  }

  const prevThreshold = currentTier ? currentTier.threshold : 0;
  const progressPercent = Math.round(
    ((messageCount - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100
  );

  return { messageCount, currentTier, nextTier, progressPercent };
}

module.exports = { TIER_ROLES, computeTierProgress };
