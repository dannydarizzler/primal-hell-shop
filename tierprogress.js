// Message-count tier progression — MUST stay in sync with TIER_ROLES in bot.py.
// The bot is the source of truth for role-assignment and reward amounts; this
// is only a display-side mirror so the shop can compute progress without
// needing a live connection to the bot.
const TIER_ROLES = [
  { name: 'Toxic', threshold: 10, reward: 100 },
  { name: 'Alpha', threshold: 25, reward: 200 },
  { name: 'Elemental', threshold: 60, reward: 300 },
  { name: 'Shadow', threshold: 120, reward: 400 },
  { name: 'Mythic', threshold: 240, reward: 500 },
  { name: 'Legendary', threshold: 480, reward: 600 },
  { name: 'Demonic', threshold: 900, reward: 700 },
  { name: 'Spirit', threshold: 1400, reward: 800 },
  { name: 'Origin', threshold: 1800, reward: 900 },
  { name: 'Nightmare', threshold: 2500, reward: 1000 },
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

// Sanitized version for the Shop's Profile tab — deliberately excludes message
// counts, thresholds, and percentages so players can't reverse-engineer how
// ranks are earned (that's intentionally kept vague — "be active in Discord").
function getPublicTierProgress(messageCount) {
  const full = computeTierProgress(messageCount);
  return {
    currentTierName: full.currentTier ? full.currentTier.name : null,
    nextTierName: full.nextTier ? full.nextTier.name : null,
    nextTierReward: full.nextTier ? full.nextTier.reward : null,
    progressPercent: full.progressPercent,
    maxed: !full.nextTier,
  };
}

module.exports = { TIER_ROLES, computeTierProgress, getPublicTierProgress };
