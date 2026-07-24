// Daily Lucky Wheel — 9 fixed segments (order matters, matches the visual wheel
// on the frontend 1:1). Weights are chosen so smaller prizes are more common:
//   100 Coins -> 20% per segment (3 segments = 60% total)
//   200 Coins -> 10% per segment (3 segments = 30% total)
//   500 Coins -> 4% per segment  (2 segments = 8% total)
//   Jackpot   -> 2% (1 segment)
// Total: 100%
const SPIN_SEGMENTS = [
  { amount: 100, label: '100', jackpot: false, weight: 20 },
  { amount: 200, label: '200', jackpot: false, weight: 10 },
  { amount: 100, label: '100', jackpot: false, weight: 20 },
  { amount: 500, label: '500', jackpot: false, weight: 4 },
  { amount: 2000, label: 'JACKPOT', jackpot: true, weight: 2 },
  { amount: 500, label: '500', jackpot: false, weight: 4 },
  { amount: 200, label: '200', jackpot: false, weight: 10 },
  { amount: 100, label: '100', jackpot: false, weight: 20 },
  { amount: 200, label: '200', jackpot: false, weight: 10 },
];

function drawSpinSegmentIndex() {
  const totalWeight = SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    if (roll < SPIN_SEGMENTS[i].weight) return i;
    roll -= SPIN_SEGMENTS[i].weight;
  }
  return SPIN_SEGMENTS.length - 1; // fallback (floating point safety)
}

module.exports = { SPIN_SEGMENTS, drawSpinSegmentIndex };
