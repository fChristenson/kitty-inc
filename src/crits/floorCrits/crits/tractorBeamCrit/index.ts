// the tractor beam floor crit: the number rises into a wisp over the bars,
// whose wide beam hauls every bar in view up off its floor, holds them
// shaking, then cuts out so they all crash back down at once
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const TRACTOR_IN_MS = 300;
const TRACTOR_ON_MS = 450;
const TRACTOR_FADE_IN_MS = 150;
// the haul: its rise and shaking hold, then the drop (as the bar's own lift)
const TRACTOR_RISE_MS = 900;
const TRACTOR_HOLD_MS = 300;
const TRACTOR_DROP_MS = 120;
const TRACTOR_HAUL_MS = TRACTOR_RISE_MS + TRACTOR_HOLD_MS + TRACTOR_DROP_MS;
const TRACTOR_CUT_MS = TRACTOR_ON_MS + TRACTOR_RISE_MS + TRACTOR_HOLD_MS;
const TRACTOR_CRASH_MS = TRACTOR_ON_MS + TRACTOR_HAUL_MS;
const TRACTOR_CUT_FADE_MS = 60;
const TRACTOR_STAGGER_MS = 15;
const TRACTOR_FONT = 40;
// the wisp: above the top bar, kept below the HUD; the beam reaches below
// the lowest bar (of the viewport's width)
const TRACTOR_ABOVE = 450;
const TRACTOR_HIGHEST = 0.55;
const TRACTOR_BELOW = 300;
const TRACTOR_LOWEST = 0.9;
const TRACTOR_WIDE = 760;
const TRACTOR_CORE = 180;
const TRACTOR_SPECKS = 40;
const TRACTOR_SPECK = 18;
const TRACTOR_SPECK_MS = 1100;
// rumbles while it holds them
const TRACTOR_RUMBLES = 8;
const TRACTOR_RUMBLE_EVERY_MS = 40;
const TRACTOR_RUMBLE_SHAKE = 0.2;
const TRACTOR_BLAST = 180;
const TRACTOR_SHAKE = 1.1;
const TRACTOR_TAIL_MS = 900;

const ufo = (r: Running, bars: Point[]): Point => ({
  x: bars[0].x,
  y: Math.max(
    Math.min(...bars.map((b) => b.y)) - TRACTOR_ABOVE,
    -r.viewportWidth * TRACTOR_HIGHEST,
  ),
});

registerFloorCrit("tractorBeamCrit", {
  plan(_r, bars, hit, lift) {
    bars.forEach((_, bar) => {
      lift(bar, TRACTOR_ON_MS, TRACTOR_HAUL_MS, true);
      hit(bar, TRACTOR_CRASH_MS + bar * TRACTOR_STAGGER_MS);
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const u = ufo(r, bars);
    if (ms < TRACTOR_IN_MS) {
      const p = smoothstep(ms / TRACTOR_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        u.x * p,
        u.y * p,
        lerp(r.flashFont, TRACTOR_FONT, p),
      );
    }
    let due = 0;
    for (let i = 0; i < TRACTOR_RUMBLES; i++)
      if (ms >= TRACTOR_ON_MS + TRACTOR_RISE_MS + i * TRACTOR_RUMBLE_EVERY_MS)
        due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(TRACTOR_RUMBLE_SHAKE);
    }
    if (ms >= TRACTOR_ON_MS && ms < TRACTOR_CUT_MS + TRACTOR_CUT_FADE_MS) {
      const on =
        clamp01((ms - TRACTOR_ON_MS) / TRACTOR_FADE_IN_MS) *
        (ms > TRACTOR_CUT_MS
          ? 1 - (ms - TRACTOR_CUT_MS) / TRACTOR_CUT_FADE_MS
          : 1);
      const bottom = {
        x: u.x,
        y: Math.min(
          Math.max(...bars.map((b) => b.y)) + TRACTOR_BELOW,
          r.viewportWidth * TRACTOR_LOWEST,
        ),
      };
      drawBeam(ctx, u, bottom, TRACTOR_WIDE, 0.35 * on);
      drawBeam(ctx, u, bottom, TRACTOR_CORE, 0.5 * on);
      // glitter drifting up the beam
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = on;
      for (let i = 0; i < TRACTOR_SPECKS; i++) {
        const life =
          ((ms - TRACTOR_ON_MS) / TRACTOR_SPECK_MS + holeHash(i, 1301)) % 1;
        const y = lerp(bottom.y, u.y, life);
        const spread = (TRACTOR_WIDE / 2) * ((y - u.y) / (bottom.y - u.y));
        stampGlimmer(
          ctx,
          u.x + (holeHash(i, 1302) - 0.5) * 2 * spread,
          y,
          TRACTOR_SPECK,
          life * 6,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalAlpha = 1;
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    if (ms >= TRACTOR_IN_MS * 0.6 && ms < TRACTOR_CRASH_MS + 400)
      drawWisp(
        ctx,
        () => u,
        ms,
        now,
        WISP_SIZE * 1.6,
        ms < TRACTOR_CUT_MS ? 1 : 0.4,
      );
    bars.forEach((at, bar) =>
      drawDetonation(
        ctx,
        at,
        ms - TRACTOR_CRASH_MS - bar * TRACTOR_STAGGER_MS,
        TRACTOR_BLAST,
        now,
      ),
    );
  },
  tailMs: TRACTOR_TAIL_MS,
  shake: () => TRACTOR_SHAKE,
});
