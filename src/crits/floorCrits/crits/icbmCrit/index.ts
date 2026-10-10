// the ICBM floor crit: the number turns into a missile by the street and
// launches straight up off the screen, a beat of quiet, then its warheads
// come screaming back down onto every bar in view
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
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
import { holeHash, groundY } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const ICBM_IN_MS = 280;
const ICBM_CLIMB_MS = 700;
const ICBM_QUIET_MS = 350;
const ICBM_DOWN_MS = ICBM_IN_MS + ICBM_CLIMB_MS + ICBM_QUIET_MS;
const ICBM_FALL_MS = 220;
const ICBM_EVERY_MS = 90;
const ICBM_FONT = 90;
// the pad: off to the right, by the street; the sky it climbs into and
// falls from (of the viewport's width)
const ICBM_SIDE = 0.36;
const ICBM_BELOW = 200;
const ICBM_SKY = 1.4;
const ICBM_EXHAUST = 40;
const ICBM_FLAME = 120;
const ICBM_MISSILE = 1.4;
// smoke billowing off the pad as it lifts off
const ICBM_SMOKE = 20;
const ICBM_SMOKE_MS = 500;
const ICBM_SMOKE_LINGER_MS = 400;
const ICBM_SMOKE_REACH = 220;
const ICBM_SMOKE_SIZE = 30;
// the launch's rumble
const ICBM_RUMBLES = 6;
const ICBM_RUMBLE_EVERY_MS = 70;
const ICBM_RUMBLE_SHAKE = 0.4;
const ICBM_STREAK = 30;
const ICBM_WARHEAD = 1.2;
const ICBM_BLAST = 220;
const ICBM_SHAKE = 1.2;
const ICBM_TAIL_MS = 1000;

const pad = (r: Running, bars: Point[]): Point => ({
  x: r.viewportWidth * ICBM_SIDE,
  y: groundY(r, bars, ICBM_BELOW),
});
const strikesAt = (k: number) =>
  ICBM_DOWN_MS + k * ICBM_EVERY_MS + ICBM_FALL_MS;
const target = (r: Running, bars: Point[], bar: number, k: number) =>
  along(r, bars, bar, (holeHash(k, 3001) * 2 - 1) * 0.7);

registerFloorCrit("icbmCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, k) => hit(bar, strikesAt(k)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const l = pad(r, bars);
    const sky = -w * ICBM_SKY;
    if (ms < ICBM_IN_MS) {
      const p = smoothstep(ms / ICBM_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        l.x * p,
        l.y * p,
        lerp(r.flashFont, ICBM_FONT, p),
        { rot: (-Math.PI / 2) * p },
      );
    }
    let due = 0;
    for (let i = 0; i < ICBM_RUMBLES; i++)
      if (ms >= ICBM_IN_MS + i * ICBM_RUMBLE_EVERY_MS) due++;
    while (r.kicked < due) {
      if (r.kicked++ === 0) playExplosion();
      r.shake(ICBM_RUMBLE_SHAKE);
    }
    const climb = (t: number): Point => ({
      x: l.x,
      y: lerp(l.y, sky, clamp01((t - ICBM_IN_MS) / ICBM_CLIMB_MS) ** 2),
    });
    if (ms >= ICBM_IN_MS && ms < ICBM_IN_MS + ICBM_CLIMB_MS) {
      const at = climb(ms);
      drawBeam(ctx, l, at, ICBM_EXHAUST, 0.5);
      drawMuzzleFlash(ctx, at, Math.PI / 2, 0.3, ICBM_FLAME);
    }
    drawWispBetween(
      ctx,
      climb,
      ms,
      now,
      WISP_SIZE * ICBM_MISSILE,
      1,
      ICBM_IN_MS,
      ICBM_IN_MS + ICBM_CLIMB_MS,
    );
    if (
      ms >= ICBM_IN_MS &&
      ms < ICBM_IN_MS + ICBM_CLIMB_MS + ICBM_SMOKE_LINGER_MS
    ) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < ICBM_SMOKE; i++) {
        const life =
          ((ms - ICBM_IN_MS) / ICBM_SMOKE_MS + holeHash(i, 3002)) % 1;
        const a = Math.PI + (holeHash(i, 3003) - 0.5) * 2.4;
        stampGlimmer(
          ctx,
          l.x + Math.cos(a) * ICBM_SMOKE_REACH * life,
          l.y - Math.abs(Math.sin(a)) * 60 * life,
          ICBM_SMOKE_SIZE * (1 - life),
          a,
          COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    byHeight(bars).forEach((bar, k) => {
      const to = target(r, bars, bar, k);
      const lands = strikesAt(k);
      const fall = (t: number): Point => ({
        x: to.x,
        y: lerp(sky, to.y, clamp01((t - lands + ICBM_FALL_MS) / ICBM_FALL_MS)),
      });
      if (ms >= lands - ICBM_FALL_MS && ms < lands)
        drawBeam(ctx, fall(ms - ICBM_FALL_MS / 2), fall(ms), ICBM_STREAK, 0.8);
      drawWispBetween(
        ctx,
        fall,
        ms,
        now,
        WISP_SIZE * ICBM_WARHEAD,
        1,
        lands - ICBM_FALL_MS,
        lands,
      );
      drawDetonation(ctx, to, ms - lands, ICBM_BLAST, now);
    });
  },
  tailMs: ICBM_TAIL_MS,
  shake: () => ICBM_SHAKE,
});
