// the "Bullet Fountain" event (gunfire; levels): it covers its crit, whose
// click freezes the screen while a gun wisp at the bottom middle of the
// screen opens up straight into the sky, sweeping side to side, a fountain
// of bullets arcing up and raining down onto the income bars, every hit a
// pop, a jolt and a few free levels on that bar; it fires ever faster and
// wider, and its last burst is a huge spray landing on every bar at once in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "bulletFountain";
const MAX_BARS = 5;
const SHOTS = 26;
const GUN_LIFT = 110;
// each arc peaks this far over the higher of its ends, wider as it goes
const PEAK: [number, number] = [260, 420];
// the sweep's swing across a bar, of its width
const SWEEP: [number, number] = [0.15, 0.48];
const SWEEPS = 3;
const FLASH_MS = 80;
const GUN = 0.55;
const BULLET = WISP_SIZE * 0.3;
const BIG = WISP_SIZE * 0.75;
const FINAL_GAP_MS = 120;
const HIT_SHAKE: [number, number] = [0.3, 0.9];
const BANG_GAP_MS = 60;

interface Shot {
  bar: RewardBar;
  fires: number;
  hits: number;
  to: Point;
  angle: number;
  big: boolean;
  levels: number;
  at: (ms: number) => Point | null;
}

export const forceBulletFountainEvent = registerWispEvent(
  KEY,
  "Bullet Fountain",
  () => CONFIG.bulletFountainEvent.chance,
  (floor, context, area) => {
    const { fireMs, flightMs, holdMs, mergeMs } = CONFIG.bulletFountainEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const gun: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - GUN_LIFT,
    };
    const shot = (
      bar: RewardBar,
      fires: number,
      flight: number,
      to: Point,
      peak: number,
      big: boolean,
      levels: number,
    ): Shot => {
      const ctrl: Point = {
        x: (gun.x + to.x) / 2,
        y: Math.min(gun.y, to.y) - peak,
      };
      const hits = fires + flight;
      const spot: Point = { x: 0, y: 0 };
      return {
        bar,
        fires,
        hits,
        to,
        angle: Math.atan2(ctrl.y - gun.y, ctrl.x - gun.x),
        big,
        levels,
        // a quadratic arc with x steady over time: a ballistic lob
        at: (ms) =>
          ms < fires || ms >= hits
            ? null
            : bezier(gun, ctrl, to, clamp01((ms - fires) / flight), spot),
      };
    };
    const perHit = (bar: RewardBar) =>
      Math.max(1, Math.round(levelsFor(bar.floor) / 3));
    const shots: Shot[] = Array.from({ length: SHOTS }, (_, i) => {
      const u = i / (SHOTS - 1);
      const bar = bars[i % bars.length];
      const sway =
        Math.sin(u * Math.PI * 2 * SWEEPS) * bar.box.width * lerp(SWEEP, u);
      return shot(
        bar,
        fireMs * Math.sqrt(u),
        lerp(flightMs, u),
        { x: bar.center.x + sway, y: bar.center.y },
        lerp(PEAK, u),
        false,
        perHit(bar),
      );
    });
    // the last burst: one huge round per bar, all landing together
    const finalFires = fireMs + FINAL_GAP_MS;
    const finals = bars.map((bar, k) =>
      shot(
        bar,
        finalFires,
        flightMs[1],
        {
          x: bar.center.x + (k % 2 === 0 ? -1 : 1) * bar.box.width * 0.2,
          y: bar.center.y,
        },
        PEAK[1],
        true,
        levelsFor(bar.floor),
      ),
    );
    const all = [...shots, ...finals];
    const endAt = finalFires + flightMs[1];
    const gunAt = (): Point => gun;
    let lastBang = -Infinity;

    const firing = createBeats(
      [...shots.map((s) => s.fires), finalFires],
      (ms) => ms,
      (ms) => {
        if (!cover?.isLive()) return;
        shakeScreen(ms === finalFires ? 1 : 0.25);
      },
    );
    const hitting = createBeats(
      all,
      (s) => s.hits,
      (s, k) => {
        cover!.levels(s.bar, s.levels, gun);
        if (s.big) {
          cover!.burst(s.to, 0.9);
          cover!.slam(s.bar);
          if (s === finals[finals.length - 1]) {
            cover!.blast(s.to);
            if (cover!.isLive()) playExplosion();
          }
          return;
        }
        cover!.burst(s.to, 0.3);
        if (!cover!.isLive() || s.hits - lastBang < BANG_GAP_MS) return;
        lastBang = s.hits;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / (SHOTS - 1)));
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
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const s of all) {
            if (ms < s.fires) continue;
            if (s.big) {
              drawWispBetween(ctx, s.at, ms, now, BIG, 1, s.fires, s.hits);
            } else if (ms < s.hits) drawWispHead(ctx, s.at, ms, now, BULLET, 1);
            const t = (ms - s.fires) / FLASH_MS;
            if (t < 1 && (!s.big || s === finals[0]))
              drawMuzzleFlash(ctx, gun, s.angle, t, s.big ? 150 : 60);
          }
          drawWispBetween(
            ctx,
            gunAt,
            ms,
            now,
            WISP_SIZE * GUN,
            0.6,
            0,
            finalFires,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
