// the "Thunderhead" event (lightning; worker perma tiers): it covers its crit,
// whose click freezes the screen while wisps boil up out of the clicked
// floor's button and churn together into a thundercloud along the top of
// the screen, rumbling; then bolts crack down out of it one after another,
// each striking a worker in view in a blinding flash, a crack and a jolt as
// they climb a perma tier, ever faster; the last bolt strikes in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "thunderhead";
const MAX_WORKERS = 6;
const PUFFS = 6;
// the cloud hangs HIGH px down, SPREAD of the screen wide, churning CHURN px
const HIGH = 150;
const SPREAD = 0.6;
const CHURN = 22;
const PUFF = 0.6;
const BOLT_MS = 160;
const STRIKE_SHAKE: [number, number] = [0.7, 1.4];

export const forceThunderheadEvent = registerWispEvent(
  KEY,
  "Thunderhead",
  () => CONFIG.thunderheadEvent.chance,
  (floor, context, area) => {
    const { gatherMs, strikesMs, holdMs, mergeMs } = CONFIG.thunderheadEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const width = (area.right - area.left) * SPREAD;
    const cloudY = area.top + HIGH;
    let clock: number = gatherMs;
    const strikes = workers.map((worker, k) => {
      const at = clock;
      clock += lerp(strikesMs, k / Math.max(1, workers.length - 1));
      const from: Point = {
        x: Math.max(cx - width / 2, Math.min(cx + width / 2, worker.at.x)),
        y: cloudY,
      };
      return { worker, at, bolt: createBolt(from, worker.at, 2) as Bolt };
    });
    const last = strikes[strikes.length - 1];
    const endAt = last.at;
    const puffs = Array.from({ length: PUFFS }, (_, i) => {
      const home: Point = {
        x: cx + width * (i / (PUFFS - 1) - 0.5),
        y: cloudY,
      };
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        const u = easeOut(clamp01(ms / gatherMs));
        at.x = lerp([button.x, home.x], u) + Math.sin(ms / 140 + i * 2) * CHURN;
        at.y =
          lerp([button.y, home.y], u) + Math.cos(ms / 170 + i) * CHURN * 0.5;
        return at;
      };
    });

    const rumbling = createBeats(
      [gatherMs * 0.5, gatherMs],
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(0.4 + 0.3 * k);
      },
    );
    const striking = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
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
          rumbling.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of strikes) {
            const t = (ms - s.at) / BOLT_MS;
            if (t < -0.4 || t >= 1) continue;
            drawBolt(ctx, s.bolt, t < 0 ? 0.3 : 1 - t, t < 0 ? 0.4 : 1);
            if (t >= 0) drawStrike(ctx, s.worker.at, 1 - t, 1, now);
          }
          for (const p of puffs)
            drawWispBetween(ctx, p, ms, now, WISP_SIZE * PUFF, 0.2, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
