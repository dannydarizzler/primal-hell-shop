// Maps a Discord role name to a profile badge (image + display label).
// Any active role a player holds that matches a key here shows up as a badge
// on their Profile tab. Roles NOT listed here are simply not shown as badges
// — players can hold plenty of roles that aren't badge-worthy (e.g. "VIP" is
// already its own dedicated badge, "Admin"/"Owner" are staff roles, etc).
//
// To add a new badge: drop the artwork in /public/images/badges/, then add
// an entry below with the EXACT Discord role name as the key (case-sensitive).
const BADGES = {
  'Beach Bob': { image: '/images/badges/beach-bob.jpg', label: 'Beach Bob' },
};

module.exports = { BADGES };
