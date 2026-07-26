// VIP Lucky Wheel — same 9-segment structure and odds as the standard wheel,
// but with doubled prize amounts (jackpot is a flat 5,000 instead of a simple
// double, per admin request). VIP-only: gated by users.is_vip in the shop.
const VIP_SPIN_SEGMENTS = [
  { amount: 200, label: '200', jackpot: false, weight: 20 },
  { amount: 400, label: '400', jackpot: false, weight: 10 },
  { amount: 200, label: '200', jackpot: false, weight: 20 },
  { amount: 1000, label: '1000', jackpot: false, weight: 4 },
  { amount: 5000, label: 'JACKPOT', jackpot: true, weight: 2 },
  { amount: 1000, label: '1000', jackpot: false, weight: 4 },
  { amount: 400, label: '400', jackpot: false, weight: 10 },
  { amount: 200, label: '200', jackpot: false, weight: 20 },
  { amount: 400, label: '400', jackpot: false, weight: 10 },
];

function drawVipSpinSegmentIndex() {
  const totalWeight = VIP_SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < VIP_SPIN_SEGMENTS.length; i++) {
    if (roll < VIP_SPIN_SEGMENTS[i].weight) return i;
    roll -= VIP_SPIN_SEGMENTS[i].weight;
  }
  return VIP_SPIN_SEGMENTS.length - 1; // fallback (floating point safety)
}

module.exports = { VIP_SPIN_SEGMENTS, drawVipSpinSegmentIndex };
