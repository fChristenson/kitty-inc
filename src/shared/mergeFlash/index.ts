// soft white "coins merging in" flash shared by the total-income readout and
// the overtime tick bar: capped well short of pure white, and pulsing on the
// wall clock so a steady stream of coin hits reads as a beat, not a solid glow
const WHITE_PEAK = 0.6;
const PULSE_HZ = 6;
const PULSE_FLOOR = 0.45;

// how much white to mix in (0..WHITE_PEAK) for a flash whose own fade-out
// envelope is currently `envelope` (1 = just hit, 0 = gone)
export function mergeFlashWhite(envelope: number, now: number): number {
  if (envelope <= 0) return 0;
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * PULSE_HZ * now) / 1000);
  return envelope * WHITE_PEAK * (PULSE_FLOOR + (1 - PULSE_FLOOR) * wave);
}
