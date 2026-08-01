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
  'Rank - Toxic': { image: '/images/badges/toxic.jpg', label: 'Toxic' },
  'Rank - Alpha': { image: '/images/badges/alpha.jpg', label: 'Alpha' },
  'Rank - Elemental': { image: '/images/badges/elemental.jpg', label: 'Elemental' },
  'Rank - Shadow': { image: '/images/badges/shadow.jpg', label: 'Shadow' },
  'Rank - Mythic': { image: '/images/badges/mythic.jpg', label: 'Mythic' },
  'Rank - Legendary': { image: '/images/badges/legendary.jpg', label: 'Legendary' },
  'Rank - Demonic': { image: '/images/badges/demonic.jpg', label: 'Demonic' },
  'Rank - Spirit': { image: '/images/badges/spirit.jpg', label: 'Spirit' },
  'Rank - Origin': { image: '/images/badges/origin.jpg', label: 'Origin' },
  'Rank - Nightmare': { image: '/images/badges/nightmare.jpg', label: 'Nightmare' },
  'VIP': { image: '/images/badges/vip.jpg', label: 'VIP' },
  'Deathknight Slayer': { image: '/images/badges/deathknight-slayer.jpg', label: 'Deathknight Slayer' },
};

module.exports = { BADGES };
