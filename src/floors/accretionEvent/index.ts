// the "Accretion" event (experiment: planets forming out of a dust disk;
// free hires): it covers its crit, whose click freezes the screen while a
// star wisp flares up in the middle of the screen with a disk of glitter
// dust whirling round it, the inner dust faster than the outer like real
// orbits; the dust clumps together, grain by grain, into a few planet wisps
// swelling on their own orbits, every so often a grain landing with a pop;
// then the planets break orbit one after another and arc down onto the
// empty spots, a new worker forming where each lands, the last in a big
// blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { planDisk, scatterDisk, type Orbit } from "../../shared/galaxy";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "accretion";
const MAX_PLANETS = 5;
const DUST = 240;
const GRAIN = 9;
// the disk: from INNER px out to a share of the screen's width (at most
// OUTER), seen tilted (SQUASH)
const INNER = 70;
const DISK = 0.42;
const OUTER = 330;
const SQUASH = 0.62;
// laps a second at the disk's rim; inner orbits run faster (Kepler)
const RIM_HZ = 0.9;
const STAR = WISP_SIZE * 1.6;
const PLANET: [number, number] = [WISP_SIZE * 0.35, WISP_SIZE * 1.15];
// grains clump in over this share range of the accretion, at random
const CLUMP: [number, number] = [0.35, 1];
// a planet flung off its orbit bows this far along its way to the spot
const FLING = 260;
const POP_EVERY = 12;
const POP_SHAKE = 0.15;
const LAUNCH_SHAKE = 0.5;
const LAND_SHAKE = 0.7;
const SOUND_GAP_MS = 70;

interface Planet {
  orbit: Orbit;
  hire: RewardHire;
  launchAt: number;
  landsAt: number;
  fall: (ms: number) => Point | null;
}

export const forceAccretionEvent = registerWispEvent(
  KEY,
  "Accretion",
  () => CONFIG.accretionEvent.chance,
  (floor, context, area) => {
    const { growMs, accreteMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.accretionEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_PLANETS);
    if (hires.length === 0) return;
    const star: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.4),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(star, {
      inner: INNER,
      outer,
      squash: SQUASH,
      rimHz: RIM_HZ,
    });
    const doneAt = growMs + accreteMs;

    const n = hires.length;
    const planets: Planet[] = hires.map((hire, k) => {
      const orbit: Orbit = {
        radius: lerp([INNER + 50, outer - 20], n > 1 ? k / (n - 1) : 0.5),
        phase: Math.random() * Math.PI * 2,
      };
      const launchAt = doneAt + k * gapMs;
      const landsAt = launchAt + dropMs;
      const from = disk.at(orbit, launchAt, { x: 0, y: 0 });
      const a = disk.heading(orbit, launchAt);
      const to: Point = { x: hire.x, y: hire.y };
      const bow: Point = {
        x: from.x + Math.cos(a) * FLING,
        y: from.y + Math.sin(a) * FLING,
      };
      const spot: Point = { x: 0, y: 0 };
      return {
        orbit,
        hire,
        launchAt,
        landsAt,
        fall: (ms) =>
          ms < launchAt || ms > landsAt
            ? null
            : bezier(from, bow, to, easeIn((ms - launchAt) / dropMs), spot),
      };
    });

    // each grain: its own orbit, drifting onto its planet's as it clumps in
    const grains = scatterDisk(disk, DUST).map((orbit, i) => {
      const k = i % n;
      return {
        k,
        planet: planets[k],
        orbit,
        joins: growMs + accreteMs * lerp(CLUMP, Math.random()),
      };
    });
    grains.sort((a, b) => a.joins - b.joins);
    const joined = planets.map(() => 0);
    const total = planets.map((_, k) => grains.filter((g) => g.k === k).length);
    const lastLands = planets[planets.length - 1].landsAt;
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const flaring = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clumping = createBeats(
      grains.filter((_, i) => i % POP_EVERY === POP_EVERY - 1),
      (g) => g.joins,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(POP_SHAKE);
        sound(now);
      },
    );
    const launching = createBeats(
      planets,
      (p) => p.launchAt,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const landing = createBeats(
      planets,
      (p) => p.landsAt,
      (p, _, now) => {
        giveHire(p.hire);
        const at = { x: p.hire.x, y: p.hire.y };
        if (p.landsAt === lastLands) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const grain: Point = { x: 0, y: 0 };
    const planetAt = planets.map((p) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < growMs || ms >= p.launchAt ? null : disk.at(p.orbit, ms, spot);
    });
    const starAt = () => star;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastLands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          flaring.tick(ms, now);
          clumping.tick(ms, now);
          launching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > lastLands) return;
          const flare = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - doneAt) / (gapMs * n + dropMs));
          drawWisp(
            ctx,
            starAt,
            ms,
            now,
            STAR * flare * (0.4 + 0.6 * fade),
            0.6,
          );
          joined.fill(0);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const g of grains) {
            if (ms >= g.joins) {
              joined[g.k]++;
              continue;
            }
            const u = easeIn(clamp01((ms - growMs) / (g.joins - growMs)));
            disk.drift(g.orbit, g.planet.orbit, u, ms, grain, flare);
            stampGlimmer(
              ctx,
              grain.x,
              grain.y,
              GRAIN,
              g.orbit.phase + ms * 0.01,
              g.k % 2 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
          for (let k = 0; k < n; k++) {
            const size = lerp(PLANET, joined[k] / Math.max(1, total[k]));
            drawWisp(
              ctx,
              planetAt[k],
              ms,
              now,
              size,
              0.5 + 0.5 * (joined[k] / total[k]),
            );
            drawWispBetween(
              ctx,
              planets[k].fall,
              ms,
              now,
              PLANET[1],
              1,
              planets[k].launchAt,
              planets[k].landsAt,
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
