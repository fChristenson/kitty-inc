// a bar launched like a rocket (the liftoff floor crit): it rattles as its
// flame lights, blasts off to the right and out of sight, then comes
// screaming back in from the left and stops dead in its place. Shared by the
// crit drawing the flames and the income bar moving itself
export interface BarLaunch {
  burnMs: number;
  flyMs: number;
  awayMs: number;
  backMs: number;
}

// how far it flies off, and rattles while it burns, in bar widths
const REACH = 3;
const RATTLE = 0.012;

export const launchMs = (l: BarLaunch): number =>
  l.burnMs + l.flyMs + l.awayMs + l.backMs;

// how far right of its place it is ms after its flame lights, in bar widths
export function launchOffset(l: BarLaunch, ms: number): number {
  if (ms < 0) return 0;
  if (ms < l.burnMs) return Math.sin(ms * 0.12) * RATTLE;
  const flying = ms - l.burnMs;
  if (flying < l.flyMs + l.awayMs)
    return REACH * Math.min(1, flying / l.flyMs) ** 2;
  const back = Math.min(1, (flying - l.flyMs - l.awayMs) / l.backMs);
  return -REACH * (1 - back) ** 3;
}
