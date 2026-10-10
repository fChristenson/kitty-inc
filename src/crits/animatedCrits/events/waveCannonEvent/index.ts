// the "Wave Cannon" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a cannon wisp at the screen's
// left edge opens fire, each volley a stream of wisp bullets rolling out in
// a snaking sine wave that ripples across the screen and crashes into an
// income bar, every round a pop and the wave's crash a flash, a bang and a
// jolt with free levels; the cannon swings to the next bar and fires again,
// the waves fiercer and faster, the last crashing in a huge blast and
// shake. Then the crit's tier pays out
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "waveCannon";
const MAX_BARS = 5;
const ROUNDS = 14;
const SHOT_GAP_MS = 22;
const WAVES = 2.5;
const SWELL: [number, number] = [40, 90];
const AIM_MS = 120;
const FLASH_MS = 70;
const FLASH = 46;
const CANNON = 0.7;
const CRASH_SHAKE: [number, number] = [0.6, 1.4];

// a round riding the wave from `from` to `to`, `swell` px tall, `phase` along it
function waveRound(
  from: Point,
  to: Point,
  swell: number,
  phase: number,
  firedAt: number,
  hitAt: number,
): Bullet {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const spot: Point = { x: 0, y: 0 };
  return {
    from,
    dx: dx / length,
    dy: dy / length,
    speed: length / (hitAt - firedAt),
    firedAt,
    hitAt,
    to,
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      const u = (ms - firedAt) / (hitAt - firedAt);
      // it ripples hardest mid-flight and lands dead on the bar
      const off =
        Math.sin((u * WAVES + phase) * Math.PI * 2) *
        swell *
        Math.sin(Math.PI * u);
      spot.x = from.x + dx * u + nx * off;
      spot.y = from.y + dy * u + ny * off;
      return spot;
    },
  };
}

interface Volley {
  bar: RewardBar;
  aims: number;
  fires: number;
  crashes: number;
  angle: number;
  rounds: Bullet[];
}

export const forceWaveCannonEvent = registerWispEvent(
  KEY,
  "Wave Cannon",
  () => CONFIG.waveCannonEvent.chance,
  (floor, context, area) => {
    const { volleysMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.waveCannonEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const x = area.left + 40;
    let clock = 0;
    const volleys: Volley[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const aims = clock;
      const fires = aims + AIM_MS;
      const from: Point = { x, y: bar.center.y + 120 * (k % 2 === 0 ? 1 : -1) };
      const travel = lerp(flightMs, t);
      const rounds = Array.from({ length: ROUNDS }, (_, r) =>
        waveRound(
          from,
          bar.center,
          lerp(SWELL, t),
          r / ROUNDS,
          fires + r * SHOT_GAP_MS,
          fires + r * SHOT_GAP_MS + travel,
        ),
      );
      clock = fires + lerp(volleysMs, t);
      return {
        bar,
        aims,
        fires,
        crashes: rounds[ROUNDS - 1].hitAt,
        angle: Math.atan2(bar.center.y - from.y, bar.center.x - from.x),
        rounds,
      };
    });
    const last = volleys[volleys.length - 1];
    const endAt = last.crashes;
    const bullets = volleys.flatMap((v) => v.rounds);
    const muzzle: Point = { x, y: 0 };
    const cannon = (ms: number): Point => {
      let v = volleys[0];
      for (const volley of volleys) if (ms >= volley.aims) v = volley;
      const prev = volleys[volleys.indexOf(v) - 1];
      const fromY = prev ? prev.rounds[0].from.y : v.rounds[0].from.y;
      muzzle.y = lerp(
        [fromY, v.rounds[0].from.y],
        easeOut(clamp01((ms - v.aims) / AIM_MS)),
      );
      return muzzle;
    };

    const crashing = createBeats(
      volleys,
      (v) => v.rounds[0].hitAt,
      (v, k) => {
        cover!.levels(
          v.bar,
          levelsFor(v.bar.floor, levelShare, 2),
          v.rounds[0].from,
        );
        cover!.burst(v.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, volleys.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(last.bar.center);
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
          crashing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const v of volleys) {
            if (ms < v.fires || ms > v.fires + ROUNDS * SHOT_GAP_MS + FLASH_MS)
              continue;
            const t = ((ms - v.fires) % SHOT_GAP_MS) / FLASH_MS;
            drawMuzzleFlash(ctx, v.rounds[0].from, v.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now);
          drawWispBetween(
            ctx,
            cannon,
            ms,
            now,
            WISP_SIZE * CANNON,
            0.6,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
