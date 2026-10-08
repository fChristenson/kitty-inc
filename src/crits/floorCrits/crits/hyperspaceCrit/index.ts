// the hyperspace floor crit: stars streak out of the middle faster and faster
// as the number jumps to lightspeed, then it drops out in a white flash,
// copies streaking out onto every bar in view, its own last and hardest
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const HYPER_IN_MS = 200;
const HYPER_WARP_MS = 900;
const HYPER_DROP_MS = HYPER_IN_MS + HYPER_WARP_MS;
const HYPER_FIRST_MS = 80;
const HYPER_EVERY_MS = 110;
const HYPER_TRAVEL_MS = 160;
// the star streaks: how many, how far out (of the viewport's width), and
// how fast they cycle (per ms, slow to fast)
const HYPER_STREAKS = 110;
const HYPER_REACH = 1.2;
const HYPER_SPEED: [number, number] = [0.0006, 0.0036];
const HYPER_LENGTH = 420;
const HYPER_FLASH_MS = 180;
const HYPER_FLASH = 0.85;
const HYPER_FONT = 160;
const HYPER_TRAIL = 30;
const HYPER_DROP_SHAKE = 2;
const HYPER_BLAST = 160;
const HYPER_LAST_BLAST = 320;
const HYPER_SHAKE = 1;
const HYPER_LAST_SHAKE = 2.6;
const HYPER_TAIL_MS = 900;

// the other bars top to bottom, then its own last
const exitOrder = (bars: Point[]) => [
  ...byHeight(bars).filter((bar) => bar !== 0),
  0,
];
const exitsAt = (k: number) =>
  HYPER_DROP_MS + HYPER_FIRST_MS + k * HYPER_EVERY_MS;
const target = (r: Running, bars: Point[], bar: number, k: number) =>
  along(r, bars, bar, (holeHash(k, 2001) * 2 - 1) * 0.6);

registerFloorCrit("hyperspaceCrit", {
  plan(_r, bars, hit) {
    const order = exitOrder(bars);
    order.forEach((bar, k) =>
      hit(bar, exitsAt(k) + HYPER_TRAVEL_MS, k === order.length - 1 ? 1 : 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    if (ms < HYPER_DROP_MS) {
      const warp = clamp01((ms - HYPER_IN_MS) / HYPER_WARP_MS);
      if (warp < 1)
        drawText(
          ctx,
          r.glyphs,
          r.label,
          0,
          0,
          r.flashFont * (1 - warp * warp),
          {
            sx: 1 - 0.5 * warp,
            sy: 1 + 0.6 * warp,
          },
        );
      if (ms >= HYPER_IN_MS) {
        const speed = lerp(HYPER_SPEED[0], HYPER_SPEED[1], warp);
        for (let i = 0; i < HYPER_STREAKS; i++) {
          const a = holeHash(i, 2101) * Math.PI * 2;
          const phase = ((ms - HYPER_IN_MS) * speed + holeHash(i, 2102)) % 1;
          const reach = 40 + phase * phase * w * HYPER_REACH;
          const length = 30 + HYPER_LENGTH * warp * phase;
          const dx = Math.cos(a);
          const dy = Math.sin(a);
          drawBeam(
            ctx,
            { x: dx * reach, y: dy * reach },
            { x: dx * (reach + length), y: dy * (reach + length) },
            6 + 8 * phase,
            0.85 * phase,
          );
        }
      }
    }
    const since = ms - HYPER_DROP_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(HYPER_DROP_SHAKE);
      playExplosion();
    }
    if (since >= 0 && since < HYPER_FLASH_MS) {
      ctx.fillStyle = COLOR.white;
      ctx.globalAlpha = HYPER_FLASH * (1 - since / HYPER_FLASH_MS);
      ctx.fillRect(-w * 2, -w * 3, w * 4, w * 6);
      ctx.globalAlpha = 1;
    }
    const order = exitOrder(bars);
    order.forEach((bar, k) => {
      const to = target(r, bars, bar, k);
      const u = (ms - exitsAt(k)) / HYPER_TRAVEL_MS;
      if (u >= 0 && u < 1) {
        const p = u * u;
        const at = { x: to.x * p, y: to.y * p };
        drawBeam(ctx, { x: 0, y: 0 }, at, HYPER_TRAIL, 0.7 * (1 - u));
        drawText(ctx, r.glyphs, r.label, at.x, at.y, HYPER_FONT, {
          sx: 1.2,
          sy: 0.85,
        });
      }
      drawDetonation(
        ctx,
        to,
        ms - exitsAt(k) - HYPER_TRAVEL_MS,
        k === order.length - 1 ? HYPER_LAST_BLAST : HYPER_BLAST,
        now,
      );
    });
  },
  tailMs: HYPER_TAIL_MS,
  shake: (step) => (step ? HYPER_LAST_SHAKE : HYPER_SHAKE),
});
