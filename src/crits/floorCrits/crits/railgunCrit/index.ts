// the railgun floor crit: the number rises over the bars and charges,
// glitter streaming into it, then fires one blinding shot straight down
// through every bar in view at once, recoiling up off the screen
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  glowStops,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const RAIL_MOVE_MS = 280;
const RAIL_CHARGE_MS = 1100;
const RAIL_FIRE_MS = RAIL_MOVE_MS + RAIL_CHARGE_MS;
const RAIL_BEAM_MS = 380;
const RAIL_RECOIL_MS = 320;
const RAIL_FONT = 150;
// where it charges: above the top bar, kept below the HUD; the shot ends
// below the lowest bar, kept in view (of the viewport's width)
const RAIL_ABOVE = 320;
const RAIL_HIGHEST = 0.55;
const RAIL_BELOW = 300;
const RAIL_LOWEST = 0.9;
const RAIL_RECOIL = 1200;
const RAIL_TREMBLE = 14;
// glitter streaming in: how many, from how far, and how fast (per ms)
const RAIL_STREAM = 60;
const RAIL_STREAM_REACH = 750;
const RAIL_STREAM_SPEED: [number, number] = [0.0012, 0.0052];
const RAIL_GLOW: [number, number] = [80, 300];
const RAIL_AIM_AT = 0.6;
const RAIL_WIDTH = 240;
const RAIL_FLARE = 140;
const RAIL_GROUND_BLAST = 300;
const RAIL_BLAST = 200;
const RAIL_STAGGER_MS = 12;
// rumbles while it charges, closer together as it nears the shot
const RAIL_RUMBLES = 10;
const RAIL_RUMBLE_SHAKE = 0.2;
const RAIL_FIRE_SHAKE = 3;
const RAIL_SHAKE = 1;
const RAIL_TAIL_MS = 900;

const gun = (r: Running, bars: Point[]): Point => ({
  x: bars[0].x,
  y: Math.max(
    Math.min(...bars.map((b) => b.y)) - RAIL_ABOVE,
    -r.viewportWidth * RAIL_HIGHEST,
  ),
});
const groundY = (r: Running, bars: Point[]) =>
  Math.min(
    Math.max(...bars.map((b) => b.y)) + RAIL_BELOW,
    r.viewportWidth * RAIL_LOWEST,
  );
const rumbleAt = (i: number) =>
  RAIL_MOVE_MS + RAIL_CHARGE_MS * (1 - 0.8 ** (i + 1));
// the shot reaches the bars top to bottom in a blink, RAIL_STAGGER_MS a floor
const BAR_PITCH = 700;
const strikesAt = (bars: Point[], bar: number) =>
  RAIL_FIRE_MS +
  RAIL_STAGGER_MS *
    (1 + (bars[bar].y - Math.min(...bars.map((b) => b.y))) / BAR_PITCH);

registerFloorCrit("railgunCrit", {
  plan(_r, bars, hit) {
    bars.forEach((_, bar) => hit(bar, strikesAt(bars, bar)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const g = gun(r, bars);
    const charge = clamp01((ms - RAIL_MOVE_MS) / RAIL_CHARGE_MS);
    if (ms < RAIL_MOVE_MS) {
      const p = smoothstep(ms / RAIL_MOVE_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        g.x * p,
        g.y * p,
        lerp(r.flashFont, RAIL_FONT, p),
      );
    } else if (ms < RAIL_FIRE_MS) {
      const j = Math.floor(ms / 24);
      const tremble = charge * charge * RAIL_TREMBLE;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        g.x + (holeHash(j, 21) - 0.5) * tremble,
        g.y + (holeHash(j, 22) - 0.5) * tremble,
        RAIL_FONT,
      );
    } else {
      const t = clamp01((ms - RAIL_FIRE_MS) / RAIL_RECOIL_MS);
      if (t < 1)
        drawText(
          ctx,
          r.glyphs,
          r.label,
          g.x,
          g.y - RAIL_RECOIL * (1 - (1 - t) ** 2),
          RAIL_FONT,
          { alpha: 1 - t, sy: 1.3 },
        );
    }
    let due = 0;
    for (let i = 0; i < RAIL_RUMBLES; i++) if (ms >= rumbleAt(i)) due++;
    if (ms >= RAIL_FIRE_MS) due++;
    while (r.kicked < due) {
      if (r.kicked++ < RAIL_RUMBLES) r.shake(RAIL_RUMBLE_SHAKE);
      else {
        r.shake(RAIL_FIRE_SHAKE);
        playExplosion();
      }
    }
    if (ms >= RAIL_MOVE_MS && ms < RAIL_FIRE_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 + 0.6 * charge;
      drawGlow(
        ctx,
        glowStops(COLOR.heavenlyGold),
        g.x,
        g.y,
        lerp(RAIL_GLOW[0], RAIL_GLOW[1], charge),
      );
      ctx.globalAlpha = 1;
      // glitter streaming in, faster as it charges
      const speed = lerp(RAIL_STREAM_SPEED[0], RAIL_STREAM_SPEED[1], charge);
      for (let i = 0; i < RAIL_STREAM; i++) {
        const life = ((ms - RAIL_MOVE_MS) * speed + holeHash(i, 1201)) % 1;
        const a = holeHash(i, 1202) * Math.PI * 2 + life * 2;
        const reach = RAIL_STREAM_REACH * (1 - life);
        stampGlimmer(
          ctx,
          g.x + Math.cos(a) * reach,
          g.y + Math.sin(a) * reach * 0.8,
          18 + 14 * life,
          a,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
      if (charge > RAIL_AIM_AT)
        drawAimLaser(ctx, g, { x: g.x, y: groundY(r, bars) });
    }
    const since = ms - RAIL_FIRE_MS;
    const ground = { x: g.x, y: groundY(r, bars) };
    if (since >= 0 && since < RAIL_BEAM_MS) {
      const t = since / RAIL_BEAM_MS;
      drawBeam(ctx, g, ground, RAIL_WIDTH * (1 - t), 1);
      drawBeamFlare(ctx, g, RAIL_FLARE * (1 - t), 1, now);
    }
    drawDetonation(ctx, ground, since, RAIL_GROUND_BLAST, now);
    bars.forEach((at, bar) =>
      drawDetonation(
        ctx,
        { x: g.x, y: at.y },
        ms - strikesAt(bars, bar),
        RAIL_BLAST,
        now,
      ),
    );
  },
  tailMs: RAIL_TAIL_MS,
  shake: () => RAIL_SHAKE,
});
