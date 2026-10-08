// the "Pressure Cooker" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while a bomb wisp rises out of the
// clicked floor's button into the middle of the screen and wisps of steam
// rise off every worker in view and stream into it, one after another, each
// a hiss and a jolt; the bomb swells and blinks ever faster as the screen
// rumbles, then blows in a huge blast and shake, its shockwave racing out
// over the workers, each lighting up as it passes and climbing a perma
// tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "pressureCooker";
const MAX_WORKERS = 6;
const STEAM_MS = 320;
// the bomb swells from BOMB to BOMB × SWELL; the shockwave runs WAVE px a ms
const BOMB = 0.5;
const SWELL = 2;
const WAVE = 1.6;
const STEAM = 0.28;
const FUSE = 30;
const HISS_SHAKE: [number, number] = [0.2, 0.8];

export const forcePressureCookerEvent = registerWispEvent(
  KEY,
  "Pressure Cooker",
  () => CONFIG.pressureCookerEvent.chance,
  (floor, context, area) => {
    const { riseMs, steamsMs, boilMs, holdMs, mergeMs } =
      CONFIG.pressureCookerEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const pot: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock: number = riseMs;
    const steams = workers.map((worker, k) => {
      const leaves = clock;
      clock += lerp(steamsMs, k / Math.max(1, workers.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        leaves,
        arrives: leaves + STEAM_MS,
        at: (ms: number): Point | null => {
          if (ms < leaves || ms >= leaves + STEAM_MS) return null;
          const u = easeIn((ms - leaves) / STEAM_MS);
          at.x = lerp([worker.at.x, pot.x], u) + Math.sin(ms / 40) * 6;
          at.y = lerp([worker.at.y, pot.y], u);
          return at;
        },
      };
    });
    const boomAt = clock + boilMs;
    const waves = workers.map((worker) => ({
      worker,
      at: boomAt + Math.hypot(worker.at.x - pot.x, worker.at.y - pot.y) / WAVE,
    }));
    const endAt = Math.max(...waves.map((w) => w.at));
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point | null => {
      if (ms >= boomAt) return null;
      const u = easeOut(clamp01(ms / riseMs));
      bombAt.x =
        lerp([button.x, pot.x], u) + (ms > clock ? Math.sin(ms / 15) * 3 : 0);
      bombAt.y = lerp([button.y, pot.y], u);
      return bombAt;
    };

    const hissing = createBeats(
      steams,
      (s) => s.arrives,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(HISS_SHAKE, k / Math.max(1, steams.length - 1)));
      },
    );
    const boiling = createBeats(
      [clock, clock + boilMs / 2],
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(0.8 + 0.4 * k);
      },
    );
    const boom = createBeats(
      [boomAt],
      (ms) => ms,
      () => cover!.blast(pot),
    );
    const waving = createBeats(
      waves,
      (w) => w.at,
      (w) => {
        cover!.promote(w.worker);
        cover!.burst(w.worker.at, 0.5);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          hissing.tick(ms, now);
          boiling.tick(ms, now);
          boom.tick(ms, now);
          waving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of steams)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * STEAM,
              0.2,
              s.leaves,
              s.arrives,
            );
          let arrived = 0;
          for (const s of steams) if (ms >= s.arrives) arrived++;
          const fed = arrived / steams.length;
          const size = BOMB * (1 + (SWELL - 1) * fed);
          const p = bomb(ms);
          if (p) drawLitFuse(ctx, p, clamp01(ms / boomAt), FUSE * size, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * size, fed, 0, boomAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
