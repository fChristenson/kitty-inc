// the "Kirkwood Gaps" event (galaxy; free hires): it covers its crit, whose
// click freezes the screen while a belt of glitter asteroids swirls up round
// a sun wisp, tilted, the inner ones faster, with a giant planet wisp
// circling slowly outside it; its pull tugs on the asteroids whose orbits
// beat in time with its own: band after band they're dragged out of the
// belt, opening dark gaps in it, and gathered into a wisp, every band a
// whoosh and a jolt; each wisp is flung off its orbit and arcs down onto an
// empty spot as a new worker, the last in a big blast. Then the crit's tier
// pays out
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
import { planDisk, type Orbit } from "../../../../shared/galaxy";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "kirkwoodGaps";
const STARS = 360;
const STAR = 8;
// the giant's orbit: a share of the screen's width (at most PLANET_R), and
// the belt between these shares of it
const ORBIT = 0.46;
const PLANET_R = 380;
const BELT: [number, number] = [0.42, 0.72];
const SQUASH = 0.5;
const TILT = 0.15;
const SUN = WISP_SIZE * 1.2;
const PLANET = WISP_SIZE * 0.9;
// the resonances (asteroid laps per giant lap) that open the gaps, and how
// wide a band each sweeps clean
const RESONANCES = [3, 5 / 2, 7 / 3, 2];
const BAND = 6;
const CLUMP = WISP_SIZE * 0.8;
const FLING = 220;
const GAP_SHAKE = 0.5;
const LAND_SHAKE = 0.6;

interface Gap {
  radius: number;
  hire: RewardHire;
  clump: Orbit;
  opens: number;
  flings: number;
  lands: number;
  flight: (ms: number) => Point | null;
  at: (ms: number) => Point | null;
}

export const forceKirkwoodGapsEvent = registerWispEvent(
  KEY,
  "Kirkwood Gaps",
  () => CONFIG.kirkwoodGapsEvent.chance,
  (floor, context, area) => {
    const { growMs, firstMs, gapMs, sweepMs, dropMs, holdMs, mergeMs } =
      CONFIG.kirkwoodGapsEvent;
    const hires = findRewardHires(floor, context).slice(0, RESONANCES.length);
    if (hires.length === 0) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.38),
    };
    const planetR = Math.min(PLANET_R, (area.right - area.left) * ORBIT);
    const disk = planDisk(centre, {
      inner: planetR * BELT[0],
      outer: planetR,
      squash: SQUASH,
      tilt: TILT,
      rimHz: 0.35,
    });
    const stars: Orbit[] = Array.from({ length: STARS }, () => ({
      radius: planetR * lerp(BELT, Math.random()),
      phase: Math.random() * Math.PI * 2,
    }));
    const planet: Orbit = {
      radius: planetR,
      phase: Math.random() * Math.PI * 2,
    };

    // one gap per hire, spread over the resonances
    const n = hires.length;
    const gaps: Gap[] = hires.map((hire, k) => {
      const ratio =
        RESONANCES[
          Math.round((k * (RESONANCES.length - 1)) / Math.max(1, n - 1))
        ];
      const radius = planetR * ratio ** (-2 / 3);
      const clump: Orbit = { radius, phase: Math.random() * Math.PI * 2 };
      const opens = growMs + firstMs + k * gapMs;
      const flings = opens + sweepMs;
      const lands = flings + dropMs;
      const from = disk.at(clump, flings, { x: 0, y: 0 });
      const a = disk.heading(clump, flings);
      const bow: Point = {
        x: from.x + Math.cos(a) * FLING,
        y: from.y + Math.sin(a) * FLING,
      };
      const to: Point = { x: hire.x, y: hire.y };
      const spot: Point = { x: 0, y: 0 };
      const flying: Point = { x: 0, y: 0 };
      return {
        radius,
        hire,
        clump,
        opens,
        flings,
        lands,
        at: (ms) =>
          ms < opens || ms >= flings ? null : disk.at(clump, ms, spot),
        flight: (ms) =>
          ms < flings || ms > lands
            ? null
            : bezier(from, bow, to, easeIn((ms - flings) / dropMs), flying),
      };
    });
    // the stars each gap sweeps up
    const owner = stars.map(
      (o) => gaps.find((g) => Math.abs(o.radius - g.radius) < BAND) ?? null,
    );
    const last = gaps[gaps.length - 1];
    const endMs = last.lands;

    const opening = createBeats(
      [0, ...gaps.map((g) => g.opens)],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms > 0) shakeScreen(GAP_SHAKE);
      },
    );
    const flinging = createBeats(
      gaps,
      (g) => g.flings,
      (g) => {
        cover!.burst(disk.at(g.clump, g.flings, { x: 0, y: 0 }), 0.5);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      gaps,
      (g) => g.lands,
      (g) => {
        giveHire(g.hire);
        const at = { x: g.hire.x, y: g.hire.y };
        if (g === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        playBloop();
      },
    );

    const star: Point = { x: 0, y: 0 };
    const planetSpot: Point = { x: 0, y: 0 };
    const planetAt = (ms: number) => disk.at(planet, ms, planetSpot);
    const sunAt = () => centre;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          opening.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - last.flings) / 500);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < STARS; i++) {
            const g = owner[i];
            if (g && ms >= g.flings) continue;
            const u = g ? easeIn(clamp01((ms - g.opens) / sweepMs)) : 0;
            if (g) disk.drift(stars[i], g.clump, u, ms, star, grow);
            else disk.at(stars[i], ms, star, grow);
            stampGlimmer(
              ctx,
              star.x,
              star.y,
              STAR * (1 + 0.5 * u),
              i + ms * 0.004,
              u > 0 || i % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWisp(ctx, sunAt, ms, now, SUN * grow * (0.3 + 0.7 * fade), 0.6);
          if (fade > 0)
            drawWisp(ctx, planetAt, ms, now, PLANET * grow * fade, 0.4);
          for (const g of gaps) {
            const grown = clamp01((ms - g.opens) / sweepMs);
            drawWisp(ctx, g.at, ms, now, CLUMP * (0.3 + 0.7 * grown), grown);
            drawWispBetween(
              ctx,
              g.flight,
              ms,
              now,
              CLUMP,
              1,
              g.flings,
              g.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
