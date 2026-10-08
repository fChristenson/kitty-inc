// the snap floor crit: the number snaps and every bar in view crumbles into
// glitter dust that drifts off and swirls into a whirlwind, which blows back
// and rebuilds every bar, each one flashing as it's whole again
import { drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, BAR_HALF_H } from "../../critPlayer/shared";

const SNAP_MS = 220;
const SNAP_FADE_MS = 120;
const SNAP_GROW = 0.2;
const SNAP_SHAKE = 1.2;
const CRUMBLE_FIRST_MS = SNAP_MS + 40;
const CRUMBLE_EVERY_MS = 120;
const CRUMBLE_MS = 400;
// the dust drifts loose until it's gathered into the whirlwind
const GATHER_MIN_MS = 1050;
const GATHER_AFTER_MS = 150;
const GATHER_MS = 320;
const GATHER_SHAKE = 0.8;
const SWIRL_MS = 520;
const REBUILD_EVERY_MS = 140;
// each speck's flight home, and how long a bar takes to lay back down
const FLY_MS = 300;
const LAY_MS = 200;
const DUST = 48;
// of a bar's half width: the loose dust's drift per ms, the whirlwind's
// orbits and each speck's size
const DRIFT_X: [number, number] = [0.0016, 0.0034];
const DRIFT_Y: [number, number] = [0.0008, 0.0017];
const ORBIT: [number, number] = [0.75, 1.55];
const SQUASH = 0.5;
const SPIN = 0.006;
const DUST_SIZE = 0.1;
const BLAST = 120;
const BLAST_SIDES = [-0.6, 0, 0.6];
const HIT_SHAKE = 1;
const TAIL_MS = 900;

// the k-th bar from the top crumbling, the dust gathering, that bar's dust
// flying back, and it standing whole again
const crumbleAt = (k: number) => CRUMBLE_FIRST_MS + k * CRUMBLE_EVERY_MS;
const gatherAt = (bars: number) =>
  Math.max(GATHER_MIN_MS, crumbleAt(bars - 1) + CRUMBLE_MS + GATHER_AFTER_MS);
const rebuildAt = (bars: number, k: number) =>
  gatherAt(bars) + SWIRL_MS + (bars - 1 - k) * REBUILD_EVERY_MS;
const wholeAt = (bars: number, k: number) =>
  rebuildAt(bars, k) + FLY_MS + LAY_MS;

registerFloorCrit("snapCrit", {
  plan(_r, bars, hit, _lift, crumble) {
    const n = bars.length;
    byHeight(bars).forEach((bar, k) => {
      crumble(
        bar,
        crumbleAt(k),
        CRUMBLE_MS,
        rebuildAt(n, k) + FLY_MS - crumbleAt(k) - CRUMBLE_MS,
        LAY_MS,
      );
      hit(bar, wholeAt(n, k));
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const n = bars.length;
    const half = r.moment.barHalfWidth;
    const gather = gatherAt(n);
    if (ms < SNAP_MS + SNAP_FADE_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + SNAP_GROW * Math.min(1, ms / SNAP_MS)),
        { alpha: 1 - clamp01((ms - SNAP_MS) / SNAP_FADE_MS) },
      );
    if (ms >= SNAP_MS && r.kicked === 0) {
      r.kicked = 1;
      r.shake(SNAP_SHAKE);
    }
    if (ms >= gather + GATHER_MS && r.kicked === 1) {
      r.kicked = 2;
      r.shake(GATHER_SHAKE);
    }
    const order = byHeight(bars);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < order.length; k++) {
      const b = bars[order[k]];
      const backAt = rebuildAt(n, k);
      for (let i = 0; i < DUST; i++) {
        const u = i / (DUST - 1);
        const off = crumbleAt(k) + u * CRUMBLE_MS;
        const back = backAt + u * LAY_MS;
        if (ms < off || ms >= back + FLY_MS) continue;
        const s = k * DUST + i;
        const homeX = b.x + (u * 2 - 1) * half;
        const homeY = b.y + (holeHash(s, 4401) - 0.5) * 2 * BAR_HALF_H;
        const dx = half * lerp(DRIFT_X[0], DRIFT_X[1], holeHash(s, 4402));
        const dy = -half * lerp(DRIFT_Y[0], DRIFT_Y[1], holeHash(s, 4403));
        const orbit = half * lerp(ORBIT[0], ORBIT[1], holeHash(s, 4404));
        const phase = holeHash(s, 4405) * Math.PI * 2;
        let x: number;
        let y: number;
        if (ms < gather) {
          x = homeX + dx * (ms - off);
          y = homeY + dy * (ms - off);
        } else if (ms < back) {
          // drawn in off its drift onto its orbit round the whirlwind
          const g = smoothstep(clamp01((ms - gather) / GATHER_MS));
          const a = phase + ms * SPIN;
          x = lerp(homeX + dx * (gather - off), Math.cos(a) * orbit, g);
          y = lerp(
            homeY + dy * (gather - off),
            Math.sin(a) * orbit * SQUASH,
            g,
          );
        } else {
          const a = phase + back * SPIN;
          const p = smoothstep(clamp01((ms - back) / FLY_MS));
          x = lerp(Math.cos(a) * orbit, homeX, p);
          y = lerp(Math.sin(a) * orbit * SQUASH, homeY, p);
        }
        stampGlimmer(
          ctx,
          x,
          y,
          half * DUST_SIZE,
          s + ms * 0.004,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < order.length; k++)
      for (const side of BLAST_SIDES)
        drawDetonation(
          ctx,
          along(r, bars, order[k], side),
          ms - wholeAt(n, k),
          BLAST,
          now,
        );
  },
  tailMs: TAIL_MS,
  shake: () => HIT_SHAKE,
});
