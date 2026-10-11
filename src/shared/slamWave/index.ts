// the wave a landed slam's text rides (shared/eventEndSlam): a shine band
// sweeps across over SHINE_MS and each part hops as it passes, peaking as the
// band crosses its middle. Any target can ride it: a part `along` 0..1 of the
// way across hops 0..1..0 `ms` into the wave
export const SLAM_SHINE_MS = 450;
const HOP_MS = 280; // one part's hop
export const SLAM_WAVE_HOP = 0.5; // of the target's height
export const SLAM_WAVE_SCALE = 0.15;
export const SLAM_WAVE_MS = SLAM_SHINE_MS + HOP_MS;

export function slamWaveHop(ms: number, along: number): number {
  const t = slamWavePassed(ms, along);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
}

// how far (0..1) the hop has got past that part
export function slamWavePassed(ms: number, along: number): number {
  return Math.min(1, Math.max(0, (ms - SLAM_SHINE_MS * along) / HOP_MS + 0.5));
}
