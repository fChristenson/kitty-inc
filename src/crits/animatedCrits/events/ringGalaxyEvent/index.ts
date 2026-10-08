// the "Ring Galaxy" event (galaxy; cash): it covers its crit, whose click
// freezes the screen while a big spiral of glitter stars swirls up in the
// middle of it, tilted; a little dwarf-galaxy wisp dives in from the corner
// and punches straight through its core in a flash and a jolt, and a ring of
// starbirth ripples out from the hit through the whole disk, every star it
// passes blazing white and shoved outward; knots of new stars ignite along
// it as it goes, each a pop and a spray of coins; when it reaches the rim
// the newborn stars are flung off their orbits into the total, the last in
// a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { ringTargets } from "../../../../shared/coinTargets";
import { planDisk, scatterArms, type Orbit } from "../../../../shared/galaxy";
import { totalSpot } from "../../cashFlow";

const KEY = "ringGalaxy";
const REWARD = 4;
const STARS = 320;
const STAR = 9;
// the disk: a share of the screen's width across (at most OUTER), tilted
const DISK = 0.44;
const OUTER = 330;
const INNER = 24;
const SQUASH = 0.55;
const TILT = 0.25;
// the dwarf's dive, from this far off up to the right
const DWARF = WISP_SIZE * 0.9;
const DIVE = 700;
// the ring: BAND px thick, shoving stars up to PUSH px out, blazing them
const BAND = 40;
const PUSH = 28;
const BLAZE = 1.8;
const KNOTS = 10;
const KNOT = WISP_SIZE * 0.6;
const KNOT_COINS = 5;
const KNOT_RING: [number, number] = [30, 80];
const FLING = 260;
const HIT_SHAKE = 1;
const KNOT_SHAKE = 0.35;
const SOUND_GAP_MS = 60;

interface Knot {
  orbit: Orbit;
  ignites: number;
  flings: number;
  lands: number;
  from: Point;
  bow: Point;
  at: (ms: number) => Point | null;
  flight: (ms: number) => Point | null;
}

export const forceRingGalaxyEvent = registerWispEvent(
  KEY,
  "Ring Galaxy",
  () => CONFIG.ringGalaxyEvent.chance,
  (floor, context, area) => {
    const { growMs, diveMs, ringMs, gapMs, liftMs, holdMs, mergeMs } =
      CONFIG.ringGalaxyEvent;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.45),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(centre, {
      inner: INNER,
      outer,
      squash: SQUASH,
      tilt: TILT,
      rimHz: 0.6,
    });
    const stars = scatterArms(disk, STARS, 2, 0.5, 0.6);
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const hitAt = growMs + diveMs;
    const rimAt = hitAt + ringMs;
    const ringAt = (ms: number) =>
      lerp([0, outer + BAND * 2], clamp01((ms - hitAt) / ringMs) ** 0.8);

    // knots ignite as the ring reaches them, and are flung off from the rim
    const knots: Knot[] = Array.from({ length: KNOTS }, (_, k) => {
      const orbit: Orbit = {
        radius: lerp([outer * 0.35, outer * 0.95], (k + Math.random()) / KNOTS),
        phase: Math.random() * Math.PI * 2,
      };
      const ignites =
        hitAt + ringMs * (orbit.radius / (outer + BAND * 2)) ** 1.25;
      const flings = rimAt + k * gapMs;
      const lands = flings + liftMs;
      const from = disk.at(orbit, flings, { x: 0, y: 0 });
      const a = disk.heading(orbit, flings);
      const bow = {
        x: from.x + Math.cos(a) * FLING,
        y: from.y + Math.sin(a) * FLING,
      };
      const spot: Point = { x: 0, y: 0 };
      const flying: Point = { x: 0, y: 0 };
      return {
        orbit,
        ignites,
        flings,
        lands,
        from,
        bow,
        at: (ms) =>
          ms < ignites || ms >= flings ? null : disk.at(orbit, ms, spot),
        flight: (ms) =>
          ms < flings || ms > lands
            ? null
            : bezier(
                from,
                bow,
                total(),
                easeIn((ms - flings) / liftMs),
                flying,
              ),
      };
    });
    const last = knots[knots.length - 1];
    const endMs = last.lands;
    const dwarfFrom: Point = {
      x: centre.x + DIVE * 0.8,
      y: centre.y - DIVE * 0.6,
    };
    const dwarf: Point = { x: 0, y: 0 };
    const dwarfAt = (ms: number): Point | null => {
      const u = (ms - growMs) / diveMs;
      if (u < 0 || u > 1.6) return null;
      dwarf.x = lerp([dwarfFrom.x, centre.x], u);
      dwarf.y = lerp([dwarfFrom.y, centre.y], u);
      return dwarf;
    };
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const diving = createBeats(
      [growMs, hitAt],
      (ms) => ms,
      (ms) => {
        if (ms >= hitAt) cover!.burst(centre, 1.1);
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms >= hitAt) shakeScreen(HIT_SHAKE);
      },
    );
    const igniting = createBeats(
      knots,
      (k) => k.ignites,
      (k, _, now) => {
        const at = disk.at(k.orbit, k.ignites, { x: 0, y: 0 });
        cover!.burst(at, 0.4);
        cover!.launchFrom(at, ringTargets(at, KNOT_COINS, KNOT_RING));
        if (!cover!.isLive()) return;
        shakeScreen(KNOT_SHAKE);
        sound(now);
      },
    );
    const landing = createBeats(
      knots,
      (k) => k.lands,
      (k, _, now) => {
        if (k === last) {
          cover!.blast(total());
          return;
        }
        cover!.burst(total(), 0.4);
        if (cover!.isLive()) sound(now);
      },
    );

    const star: Point = { x: 0, y: 0 };
    const centreAt = () => centre;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          diving.tick(ms, now);
          igniting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - rimAt) / 500);
          const ring = ms >= hitAt ? ringAt(ms) : -1e4;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < stars.length; i++) {
            const o = stars[i];
            const near = Math.exp(-(((o.radius - ring) / BAND) ** 2));
            const passed = o.radius < ring ? 0.35 : 0;
            const a = disk.angle(o, ms);
            disk.place(o.radius + PUSH * (near + passed), a, star, grow);
            stampGlimmer(
              ctx,
              star.x,
              star.y,
              STAR * (1 + (BLAZE - 1) * near),
              a * 3,
              near > 0.5 || i % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          if (fade > 0)
            drawWisp(ctx, centreAt, ms, now, WISP_SIZE * grow * fade, 0.5);
          drawWisp(ctx, dwarfAt, ms, now, DWARF, 0.9);
          for (const k of knots) {
            drawWisp(ctx, k.at, ms, now, KNOT, 0.8);
            drawWispBetween(ctx, k.flight, ms, now, KNOT, 1, k.flings, k.lands);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
