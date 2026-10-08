// the bunker buster floor crit: the number slams like a heavy bomb into the
// top bar in view and burrows down through the rest with muffled thuds,
// goes quiet under the ground, then erupts back up through every bar
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
} from "../../critPlayer";
import { holeHash, skyY, groundY, BAR_HALF_H } from "../../critPlayer/shared";

const BUNKER_IN_MS = 220;
const BUNKER_FALL_MS = 260;
const BUNKER_IMPACT_MS = BUNKER_IN_MS + BUNKER_FALL_MS;
const BUNKER_THUD_MS = 230;
const BUNKER_QUIET_MS = 250;
const BUNKER_RISE_MS = 60;
const BUNKER_FONT = 210;
const BUNKER_ABOVE = 300;
const BUNKER_BELOW = 300;
const BUNKER_STRETCH = 0.5;
// the dust puffing off each bar it thuds through
const BUNKER_DUST_MS = 450;
const BUNKER_DUST = 14;
const BUNKER_DUST_SIZE = 22;
const BUNKER_DUST_REACH: [number, number] = [60, 220];
const BUNKER_ERUPT_BLAST = 420;
const BUNKER_ERUPT_SHAKE = 3;
const BUNKER_IMPACT_BLAST = 130;
const BUNKER_THUD_BLAST = 50;
const BUNKER_BLAST = 230;
const BUNKER_THUD_SHAKE = 0.7;
const BUNKER_SHAKE = 1.2;
const BUNKER_TAIL_MS = 1300;

// the k-th bar from the top is thudded through, and when it's all quiet
const thudsAt = (k: number) => BUNKER_IMPACT_MS + k * BUNKER_THUD_MS;
const eruptsAt = (bars: number) => thudsAt(bars) + BUNKER_QUIET_MS;
// the eruption reaches the j-th bar from the bottom
const blowsAt = (bars: number, j: number) =>
  eruptsAt(bars) + (j + 1) * BUNKER_RISE_MS;

const ground = (r: Running, bars: Point[]): Point => ({
  x: bars[0].x,
  y: groundY(r, bars, BUNKER_BELOW),
});

registerFloorCrit("bunkerBusterCrit", {
  plan(_r, bars, hit) {
    const order = byHeight(bars);
    order.forEach((bar, k) => hit(bar, thudsAt(k)));
    [...order]
      .reverse()
      .forEach((bar, j) => hit(bar, blowsAt(bars.length, j), 1));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const x = bars[0].x;
    const top = bars[order[0]];
    const g = ground(r, bars);
    const erupts = eruptsAt(bars.length);
    if (ms < BUNKER_IMPACT_MS) {
      // heaved up over the top bar, then slammed down into it
      const from = { x, y: skyY(r, bars, BUNKER_ABOVE) };
      const q = smoothstep(clamp01(ms / BUNKER_IN_MS));
      const p =
        ms < BUNKER_IN_MS ? 0 : ((ms - BUNKER_IN_MS) / BUNKER_FALL_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(from.x * q, x, p),
        lerp(from.y * q, top.y - BAR_HALF_H, p),
        lerp(r.flashFont, BUNKER_FONT, q),
        { sx: 1 - 0.2 * p, sy: 1 + BUNKER_STRETCH * p },
      );
    }
    // its glow sinking down through the building
    drawWispBetween(
      ctx,
      (t) => ({
        x,
        y: lerp(
          top.y,
          g.y,
          clamp01(
            (t - BUNKER_IMPACT_MS) / (thudsAt(bars.length) - BUNKER_IMPACT_MS),
          ),
        ),
      }),
      ms,
      now,
      WISP_SIZE * 0.9,
      0.2,
      BUNKER_IMPACT_MS,
      thudsAt(bars.length),
    );
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    order.forEach((bar, k) => {
      const since = ms - thudsAt(k);
      if (since < 0 || since > BUNKER_DUST_MS) return;
      const life = since / BUNKER_DUST_MS;
      const at = bars[bar];
      for (let i = 0; i < BUNKER_DUST; i++) {
        const a = -Math.PI / 2 + (holeHash(i, k + 1900) - 0.5) * 2.2;
        const reach =
          lerp(BUNKER_DUST_REACH[0], BUNKER_DUST_REACH[1], life) *
          (0.5 + 0.5 * holeHash(i, 1901));
        stampGlimmer(
          ctx,
          x + Math.cos(a) * reach,
          at.y - BAR_HALF_H + Math.sin(a) * reach * 0.6 + 60 * life * life,
          BUNKER_DUST_SIZE * (1 - life),
          a,
          COLOR.heavenlyGold,
        );
      }
    });
    ctx.globalCompositeOperation = previous;
    if (ms >= erupts && r.kicked === 0) {
      r.kicked = 1;
      r.shake(BUNKER_ERUPT_SHAKE);
      playExplosion();
    }
    drawDetonation(ctx, g, ms - erupts, BUNKER_ERUPT_BLAST, now);
    order.forEach((bar, k) =>
      drawDetonation(
        ctx,
        bars[bar],
        ms - thudsAt(k),
        k === 0 ? BUNKER_IMPACT_BLAST : BUNKER_THUD_BLAST,
        now,
      ),
    );
    [...order]
      .reverse()
      .forEach((bar, j) =>
        drawDetonation(
          ctx,
          bars[bar],
          ms - blowsAt(bars.length, j),
          BUNKER_BLAST,
          now,
        ),
      );
  },
  tailMs: BUNKER_TAIL_MS,
  shake: (step) => (step ? BUNKER_SHAKE : BUNKER_THUD_SHAKE),
});
