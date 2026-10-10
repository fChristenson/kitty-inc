// the galaxy floor crit: a galaxy round a sun that goes supernova, flinging comets onto the bars
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawStars, planDisk, scatterArms } from "../../../../shared/galaxy";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

// a sun blazing up where the number is, a galaxy of stars swirling round it
// in spiral arms, ever faster, until it goes supernova and flings them off
// their orbits, two comets slamming into each bar
const GALAXY_INNER = 0.07;
const GALAXY_OUTER = 0.45;
const GALAXY_STARS = 420;
const GALAXY_STAR_SIZE = 16;
const GALAXY_GROW_MS = 400;
const GALAXY_NOVA_MS = 1400;
const GALAXY_FLY_MS = 380;
const GALAXY_FLUNG_MS = 700;
const GALAXY_SUN_SIZE = 2;
const GALAXY_SUN_SWELL = 3;
const GALAXY_BLAST = 400;
const GALAXY_SHAKE = 2.4;
const GALAXY_COMETS_PER_BAR = 2;
const GALAXY_COMET_SIZE = 1.3;
const GALAXY_COMET_BLAST = 160;
const GALAXY_COMET_SHAKE = 0.4;
// how far a comet is thrown along its orbit before curving onto its bar
const GALAXY_KICK = 0.4;
const GALAXY_TAIL_MS = 600;
// the disk's own clock, running faster and faster
const galaxyClock = (ms: number) => ms + (ms * ms) / 600;
const galaxyHits = (i: number) => GALAXY_NOVA_MS + GALAXY_FLY_MS + (i % 3) * 40;
const galaxyStar: Point = { x: 0, y: 0 };

registerFloorCrit("galaxyCrit", {
  plan(r, bars, hit) {
    const w = r.viewportWidth;
    const disk = planDisk(
      { x: 0, y: 0 },
      {
        inner: w * GALAXY_INNER,
        outer: w * GALAXY_OUTER,
        squash: 0.45,
        tilt: -0.3,
        rimHz: 0.3,
      },
    );
    r.galaxy = {
      disk,
      stars: scatterArms(disk, GALAXY_STARS, 3, 0.9, 0.3),
    };
    for (let i = 0; i < bars.length * GALAXY_COMETS_PER_BAR; i++)
      hit(i % bars.length, galaxyHits(i));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { disk, stars } = r.galaxy!;
    if (ms < GALAXY_NOVA_MS) {
      // the number collapsing into the sun as the galaxy grows out round it
      // and turns, quicker and quicker
      const gulp = clamp01(ms / GALAXY_GROW_MS);
      if (gulp < 1)
        drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - gulp));
      drawStars(
        ctx,
        disk,
        stars,
        galaxyClock(ms),
        GALAXY_STAR_SIZE,
        1 - (1 - gulp) ** 3,
      );
      const u = ms / GALAXY_NOVA_MS;
      drawWispBetween(
        ctx,
        () => disk.center,
        ms,
        now,
        WISP_SIZE *
          (GALAXY_SUN_SIZE + GALAXY_SUN_SWELL * u * u) *
          (1 + 0.15 * Math.sin(u * u * 70)),
        u,
        0,
        GALAXY_NOVA_MS,
      );
    }
    const since = ms - GALAXY_NOVA_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(GALAXY_SHAKE);
    }
    const t = galaxyClock(GALAXY_NOVA_MS);
    // the stars flung off their orbits the way they were heading, fading
    const fade = 1 - since / GALAXY_FLUNG_MS;
    if (since >= 0 && fade > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = fade;
      for (let i = 0; i < stars.length; i++) {
        const o = stars[i];
        disk.at(o, t, galaxyStar);
        const h = disk.heading(o, t);
        const out = since * (1.2 + o.radius / 300);
        stampGlimmer(
          ctx,
          galaxyStar.x + Math.cos(h) * out,
          galaxyStar.y + Math.sin(h) * out,
          GALAXY_STAR_SIZE,
          h,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawDetonation(ctx, disk.center, since, GALAXY_BLAST, now);
    // comets thrown off along their orbits, curving onto the bars
    for (let i = 0; i < bars.length * GALAXY_COMETS_PER_BAR; i++) {
      const hits = galaxyHits(i);
      if (since < 0 || ms > hits + DETONATION_MS) continue;
      const orbit = stars[(i * 37) % stars.length];
      const from = disk.at(orbit, t, { x: 0, y: 0 });
      const h = disk.heading(orbit, t);
      const kick = r.viewportWidth * GALAXY_KICK;
      const to = along(r, bars, i % bars.length, holeHash(i, 51) * 2 - 1);
      drawWispBetween(
        ctx,
        (at) => {
          const p = clamp01((at - GALAXY_NOVA_MS) / (hits - GALAXY_NOVA_MS));
          return {
            x: lerp(from.x + Math.cos(h) * kick * p, to.x, p * p),
            y: lerp(from.y + Math.sin(h) * kick * p, to.y, p * p),
          };
        },
        ms,
        now,
        WISP_SIZE * GALAXY_COMET_SIZE,
        0.8,
        GALAXY_NOVA_MS,
        hits,
      );
      drawDetonation(ctx, to, ms - hits, GALAXY_COMET_BLAST, now);
    }
  },
  tailMs: GALAXY_TAIL_MS,
  shake: () => GALAXY_COMET_SHAKE,
});
