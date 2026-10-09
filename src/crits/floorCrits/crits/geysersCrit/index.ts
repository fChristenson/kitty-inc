// the geysers floor crit: the number dives into the street and geysers of
// light burst up out of it one after another across the screen, each
// blasting up through every bar in view over it in a rattle; the last, giant
// one bursts up under its own bar in a huge blast
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { groundY, holeHash, skyY } from "../../critPlayer/shared";

const GY_IN_MS = 220;
const GY_FIRST_MS = GY_IN_MS + 40;
const GY_GEYSERS = 8;
const GY_EVERY_MS = 90;
const GY_LAST_DELAY_MS = 120;
// a geyser shooting from the street under the lowest bar to over the top one
const GY_BELOW = 260;
const GY_ABOVE = 600;
const GY_RISE_MS = 140;
const GY_LAST_RISE_MS = 70;
const GY_HOLD_MS = 200;
const GY_FADE_MS = 160;
const GY_WIDTH = 70;
const GY_LAST_WIDTH = 200;
const GY_FLARE = 60;
const GY_LAST_FLARE = 120;
const GY_SHAKE = 0.5;
const GY_BLAST = 130;
// the giant one's huge blast, then a run out along its bar
const GY_BOOM = 440;
const GY_OWN_SIDES = [-0.5, 0.5, -1, 1];
const GY_OWN_EVERY_MS = 45;
const GY_OWN_BLAST = 170;
const GY_KICKED_BOOM = 1e6;
// shakes by step: a blast, the giant one
const GY_SHAKES = [0.4, 3];
const GY_TAIL_MS = 1000;

interface Geyser {
  side: number;
  at: number;
  last: boolean;
}
const fields = new WeakMap<Running, Geyser[]>();

const geyserAt = (i: number) =>
  GY_FIRST_MS + i * GY_EVERY_MS + (i === GY_GEYSERS - 1 ? GY_LAST_DELAY_MS : 0);
const boomAt = () => geyserAt(GY_GEYSERS - 1) + GY_LAST_RISE_MS;

// when geyser g's head reaches a bar at y, rising from ground to sky
const crossAt = (g: Geyser, y: number, ground: number, sky: number) =>
  g.at + ((ground - y) / (ground - sky)) * GY_RISE_MS;

registerFloorCrit("geysersCrit", {
  plan(r, bars, hit) {
    const geysers = Array.from({ length: GY_GEYSERS }, (_, i) => {
      const last = i === GY_GEYSERS - 1;
      return {
        side: last ? 0 : (holeHash(i, 910) * 2 - 1) * 0.9,
        at: geyserAt(i),
        last,
      };
    });
    fields.set(r, geysers);
    const ground = groundY(r, bars, GY_BELOW);
    const sky = skyY(r, bars, GY_ABOVE);
    for (const g of geysers) {
      if (g.last) continue;
      bars.forEach((b, bar) => hit(bar, crossAt(g, b.y, ground, sky), 0));
    }
    hit(0, boomAt(), 1);
    GY_OWN_SIDES.forEach((_, k) =>
      hit(0, boomAt() + (k + 1) * GY_OWN_EVERY_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const geysers = fields.get(r);
    if (!geysers) return;
    const now = r.startedAt + ms;
    const ground = groundY(r, bars, GY_BELOW);
    const sky = skyY(r, bars, GY_ABOVE);
    if (ms < GY_IN_MS) {
      const p = (ms / GY_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, ground * p, r.flashFont, {
        along: Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }

    // a jolt as each bursts out of the street, then the giant one's bang
    while (r.kicked < GY_GEYSERS - 1 && geysers[r.kicked].at <= ms) {
      r.shake(GY_SHAKE);
      r.kicked++;
    }
    if (ms >= boomAt() && r.kicked < GY_KICKED_BOOM) {
      r.kicked = GY_KICKED_BOOM;
      playExplosion();
    }

    for (const g of geysers) {
      const x = along(r, bars, 0, g.side).x;
      const t = ms - g.at;
      if (t >= 0 && t < GY_HOLD_MS + GY_FADE_MS) {
        const head = g.last
          ? lerp(ground, bars[0].y, clamp01(t / GY_LAST_RISE_MS))
          : lerp(ground, sky, clamp01(t / GY_RISE_MS));
        const fade = 1 - clamp01((t - GY_HOLD_MS) / GY_FADE_MS);
        const foot: Point = { x, y: ground };
        drawBeam(
          ctx,
          foot,
          { x, y: head },
          g.last ? GY_LAST_WIDTH : GY_WIDTH,
          fade,
        );
        drawBeamFlare(ctx, foot, g.last ? GY_LAST_FLARE : GY_FLARE, fade, now);
      }
      if (g.last) continue;
      for (const b of bars)
        drawDetonation(
          ctx,
          { x, y: b.y },
          ms - crossAt(g, b.y, ground, sky),
          GY_BLAST,
          now,
        );
    }
    drawDetonation(ctx, bars[0], ms - boomAt(), GY_BOOM, now);
    GY_OWN_SIDES.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boomAt() - (k + 1) * GY_OWN_EVERY_MS,
        GY_OWN_BLAST,
        now,
      ),
    );
  },
  tailMs: GY_TAIL_MS,
  shake: (step) => GY_SHAKES[step] ?? GY_SHAKES[0],
});
