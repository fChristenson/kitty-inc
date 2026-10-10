// the "Strafing Run" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a gunship wisp screams in off
// the screen's side and makes low pass after pass over the income bars,
// back and forth down the screen, ever faster, guns blazing: a stream of
// wisp bullets rakes each bar end to end, every hit a flash and a pop, and
// each bar it rakes jolts with a bang and free levels; it pulls up off the
// last pass over the clicked floor's bar as every bar slams in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "strafingRun";
const MAX_BARS = 4;
// the gunship flies HIGH px over each bar, overshooting its ends by OVER px,
// firing every FIRE_MS at a spot LEAD px ahead on the bar
const HIGH = 130;
const OVER = 70;
const FIRE_MS = 40;
const LEAD = 40;
const SPEED = 2.2;
const BULLET = WISP_SIZE * 0.3;
const SHIP = 0.8;
const MUZZLE = 40;
const FLASH_MS = 60;
const RAKE_SHAKE: [number, number] = [0.6, 1.3];

export const forceStrafingRunEvent = registerWispEvent(
  KEY,
  "Strafing Run",
  () => CONFIG.strafingRunEvent.chance,
  (floor, context) => {
    const { passesMs, turnMs, levelShare, holdMs, mergeMs } =
      CONFIG.strafingRunEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    // passes alternate direction; each starts where the last turn ended
    let clock = 0;
    const passes = bars.map((bar, k) => {
      const rightward = k % 2 === 0;
      const y = bar.box.y - HIGH;
      const left = bar.box.x - OVER;
      const right = bar.box.x + bar.box.width + OVER;
      const from: Point = { x: rightward ? left : right, y };
      const to: Point = { x: rightward ? right : left, y };
      const starts = k === 0 ? 0 : clock + turnMs;
      const span = lerp(passesMs, k / Math.max(1, bars.length - 1));
      clock = starts + span;
      return { bar, from, to, starts, ends: clock, span, rightward };
    });
    const flightEnd = passes[passes.length - 1].ends;
    const shipAt = (ms: number, into: Point): Point => {
      let k = 0;
      while (k < passes.length - 1 && ms > passes[k].ends) k++;
      const p = passes[k];
      if (ms < p.starts && k > 0) {
        // turning between passes on a hairpin
        const prev = passes[k - 1];
        const u = smoothstep((ms - prev.ends) / turnMs);
        into.x =
          prev.to.x + Math.sin(u * Math.PI) * OVER * (prev.rightward ? 1 : -1);
        into.y = lerp([prev.to.y, p.from.y], u);
        return into;
      }
      const u = clamp01((ms - p.starts) / p.span);
      into.x = lerp([p.from.x, p.to.x], u);
      into.y = p.from.y;
      return into;
    };
    // a stream of shots raking each bar end to end
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const rakes: { bar: RewardBar; at: number }[] = [];
    for (const p of passes) {
      let last = 0;
      for (let ms = p.starts; ms < p.ends; ms += FIRE_MS) {
        const from = shipAt(ms, { x: 0, y: 0 });
        const ahead = from.x + (p.rightward ? LEAD : -LEAD);
        if (ahead < p.bar.box.x || ahead > p.bar.box.x + p.bar.box.width)
          continue;
        const hit: Point = { x: ahead, y: p.bar.center.y };
        const b = aimBullet(from, hit, ms, SPEED);
        bullets.push(b);
        flashes.push({
          at: ms,
          from,
          angle: Math.atan2(hit.y - from.y, hit.x - from.x),
        });
        last = b.hitAt;
      }
      rakes.push({ bar: p.bar, at: last });
    }
    const endAt = Math.max(flightEnd, ...rakes.map((r) => r.at));
    const shipPoint: Point = { x: 0, y: 0 };
    const ship = (ms: number): Point | null =>
      ms < 0 || ms > flightEnd ? null : shipAt(ms, shipPoint);

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.12),
    );
    const raking = createBeats(
      rakes,
      (r) => r.at,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), {
          x: r.bar.center.x,
          y: r.bar.center.y - HIGH,
        });
        if (k === rakes.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RAKE_SHAKE, k / Math.max(1, rakes.length - 1)));
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
          pinging.tick(ms, now);
          raking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            ship,
            ms,
            now,
            WISP_SIZE * SHIP,
            1,
            0,
            flightEnd,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
