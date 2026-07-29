// Resolves Discord user IDs to real display names directly via the Discord
// API — so the shop doesn't need to wait for the bot to push a name via
// message-activity tracking. Requires two env vars:
//   DISCORD_BOT_TOKEN  — a bot token with access to the server (can be the
//                        same token bot.py already uses)
//   DISCORD_GUILD_ID   — the Primal Hell Discord server's ID
// If either is missing, every lookup below just returns null and callers
// fall back to whatever name they already have (or the raw Discord ID).
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const GUILD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let guildMemberCache = new Map(); // discordId -> displayName
let guildMemberCacheAt = 0;
let refreshInFlight = null;

function isConfigured() {
  return !!DISCORD_BOT_TOKEN;
}

async function discordFetch(path) {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) {
    // Logged (not thrown) so a bad token/guild ID/missing intent shows up in
    // Railway logs instead of silently degrading to "shows raw Discord IDs".
    const body = await res.text().catch(() => '');
    console.error(`[discordapi] GET ${path} -> ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
    return null;
  }
  return res.json();
}

function bestName(member) {
  return member.nick || member.user?.global_name || member.user?.username || null;
}

/** Fetches (and caches for a few minutes) the whole guild's member list as a
 * Map<discordId, displayName>. One-time cost per refresh window instead of
 * one API call per member — Discord has no bulk "get users by ID" endpoint,
 * but it does let a bot list all guild members a page (1000) at a time. */
async function getGuildMemberMap() {
  if (!isConfigured() || !DISCORD_GUILD_ID) return guildMemberCache;

  const now = Date.now();
  if (now - guildMemberCacheAt < GUILD_CACHE_TTL_MS) return guildMemberCache;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const map = new Map();
    try {
      let after = '0';
      for (let page = 0; page < 10; page++) { // up to 10,000 members
        const members = await discordFetch(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`);
        if (!members || members.length === 0) break;
        for (const m of members) {
          const name = bestName(m);
          if (m.user?.id && name) map.set(m.user.id, name);
        }
        if (members.length < 1000) break;
        after = members[members.length - 1].user.id;
      }
      guildMemberCache = map;
      guildMemberCacheAt = Date.now();
    } catch (err) {
      // Network hiccup or bad token — keep serving the previous cache (or empty)
      // rather than throwing, since this must never block registration/analytics.
      console.error('[discordapi] getGuildMemberMap failed:', err.message);
    }
    refreshInFlight = null;
    return guildMemberCache;
  })();

  return refreshInFlight;
}

/** Resolves a single Discord ID to a display name. Checks the cached guild
 * member map first (no extra network call in the common case); falls back
 * to a direct single-user lookup for people who've left the server. Returns
 * null if unresolvable (no token configured, invalid/unknown ID, etc). */
async function resolveDiscordName(discordId) {
  const map = await getGuildMemberMap();
  if (map.has(discordId)) return map.get(discordId);

  if (!isConfigured()) return null;
  try {
    const user = await discordFetch(`/users/${discordId}`);
    return user ? (user.global_name || user.username || null) : null;
  } catch {
    return null;
  }
}

module.exports = { isConfigured, getGuildMemberMap, resolveDiscordName };

if (isConfigured() && DISCORD_GUILD_ID) {
  console.log('[discordapi] Discord name resolution is configured (guild ' + DISCORD_GUILD_ID + ').');
} else {
  console.log('[discordapi] Not configured — set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID to enable automatic Discord name resolution. Falling back to raw Discord IDs until then.');
}
