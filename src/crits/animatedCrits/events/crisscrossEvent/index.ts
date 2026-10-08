// the "Crisscross" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while two gun wisps streak along an income bar
// in opposite directions, one skimming above it and one below, each
// hammering slanted bursts across the bar at the other's line, the rounds
// stitching a lattice of crossing tracers over it, every hit a pop; as they
// pass each other in the middle the bar flashes with a bang and a jolt and
// jumps a crit tier; pass after pass, bar after bar, ever faster, the last
// crossing a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "crisscross";
const MAX_BARS = 4;
const LANE = 60;
const REACH = 40;
const SHOTS = 9;
const SLANT = 70;
const BULLET_SPEED = 1.2;
const FLASH_MS = 60;
const FLASH = 34;
const GUN = 0.45;
const PASS_SHAKE: [number, number] = [0.7, 1.5];

interface Pass {
  bar: RewardBar;
  starts: number;
  crosses: number;
  ends: number;
  lanes: [Point, Point][];
  shots: { bullet: Bullet; side: number; angle: number }[];
}

export const forceCrisscrossEvent = registerWispEvent(
  KEY,
  "Crisscross",
  () => CONFIG.crisscrossEvent.chance,
  (floor, context) => {
    const { passesMs, holdMs, mergeMs } = CONFIG.crisscrossEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const passes: Pass[] = bars.map((bar, k) => {
      const span = lerp(passesMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      const ends = starts + span;
      clock = starts + span * 0.75;
      const left = bar.box.x - REACH;
      const right = bar.box.x + bar.box.width + REACH;
      // the top gun runs left to right, the bottom one back
      const lanes: [Point, Point][] = [
        [
          { x: left, y: bar.center.y - LANE },
          { x: right, y: bar.center.y - LANE },
        ],
        [
          { x: right, y: bar.center.y + LANE },
          { x: left, y: bar.center.y + LANE },
        ],
      ];
      const shots = lanes.flatMap(([from, to], side) =>
        Array.from({ length: SHOTS }, (_, i) => {
          const u = (i + 0.5) / SHOTS;
          const firedAt = starts + span * u;
          const gun = { x: lerp([from.x, to.x], u), y: from.y };
          const dir = to.x > from.x ? 1 : -1;
          const target = {
            x: gun.x + dir * SLANT,
            y: bar.center.y - (gun.y - bar.center.y),
          };
          return {
            bullet: aimBullet(gun, target, firedAt, BULLET_SPEED),
            side,
            angle: Math.atan2(target.y - gun.y, target.x - gun.x),
          };
        }),
      );
      return { bar, starts, crosses: starts + span / 2, ends, lanes, shots };
    });
    const last = passes[passes.length - 1];
    const endAt = last.ends;
    const bullets = passes.flatMap((p) => p.shots.map((s) => s.bullet));
    const gunAts = passes.flatMap((p) =>
      p.lanes.map(([from, to]) => {
        const spot: Point = { x: 0, y: from.y };
        return (ms: number): Point => {
          spot.x = lerp(
            [from.x, to.x],
            clamp01((ms - p.starts) / (p.ends - p.starts)),
          );
          return spot;
        };
      }),
    );

    const popping = createBeats(
      bullets.filter((_, i) => i % 3 === 0),
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.2);
        if (cover!.isLive()) playBloop();
      },
    );
    const crossing = createBeats(
      passes,
      (p) => p.crosses,
      (p, k) => {
        cover!.tierUp(p.bar);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          popping.tick(ms, now);
          crossing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const p of passes) {
            if (ms < p.starts || ms > p.ends + FLASH_MS) continue;
            for (const s of p.shots) {
              const t = (ms - s.bullet.firedAt) / FLASH_MS;
              if (t > 0 && t < 1)
                drawMuzzleFlash(ctx, s.bullet.from, s.angle, t, FLASH);
            }
          }
          drawBullets(ctx, bullets, ms, now, undefined, true);
          for (let i = 0; i < passes.length; i++) {
            const p = passes[i];
            drawWispBetween(
              ctx,
              gunAts[i * 2],
              ms,
              now,
              WISP_SIZE * GUN,
              0.5,
              p.starts,
              p.ends,
            );
            drawWispBetween(
              ctx,
              gunAts[i * 2 + 1],
              ms,
              now,
              WISP_SIZE * GUN,
              0.5,
              p.starts,
              p.ends,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
