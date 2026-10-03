// the "Defibrillator" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while two paddle wisps fly out of
// the clicked floor's button and close in on a worker in view from either
// side, whining as they charge up and glow ever brighter; then they slam
// onto it and a jagged bolt cracks between them straight through the
// worker in a blinding flash, a jolt and a crack that shocks it up a perma
// tier; worker after worker, ever faster; the last zap goes off in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardWorkers } from "../eventRewards";

const KEY = "defibrillator";
const MAX_WORKERS = 4;
// paddles wait WIDE px either side of a worker while charging, then slam
// in to CLOSE px
const WIDE = 60;
const CLOSE = 18;
const SLAM_MS = 70;
const ZAP_MS = 180;
const PADDLE: [number, number] = [0.4, 0.75];
const ZAP_SHAKE: [number, number] = [0.8, 1.5];

export const forceDefibrillatorEvent = registerWispEvent(
  KEY,
  "Defibrillator",
  () => CONFIG.defibrillatorEvent.chance,
  (floor, context) => {
    const { moveMs, chargesMs, holdMs, mergeMs } = CONFIG.defibrillatorEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const shocks = workers.map((worker, k) => {
      const leaves = clock;
      const arrives = leaves + moveMs;
      const charge = lerp(chargesMs, k / Math.max(1, workers.length - 1));
      const zaps = arrives + charge + SLAM_MS;
      clock = zaps + ZAP_MS;
      const left: Point = { x: worker.at.x - CLOSE, y: worker.at.y };
      const right: Point = { x: worker.at.x + CLOSE, y: worker.at.y };
      return {
        worker,
        leaves,
        arrives,
        charge,
        zaps,
        bolt: createBolt(left, right, 1),
      };
    });
    const endAt = shocks[shocks.length - 1].zaps + ZAP_MS;
    const glow = { size: PADDLE[0], heat: 0 };
    const paddles = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        let k = 0;
        while (k < shocks.length - 1 && ms >= shocks[k + 1].leaves) k++;
        const s = shocks[k];
        const from = k === 0 ? button : shocks[k - 1].worker.at;
        const fromOff = k === 0 ? 0 : CLOSE;
        if (ms < s.arrives) {
          const u = smoothstep((ms - s.leaves) / moveMs);
          at.x = lerp(
            [from.x + side * fromOff, s.worker.at.x + side * WIDE],
            u,
          );
          at.y = lerp([from.y, s.worker.at.y], u) - Math.sin(Math.PI * u) * 40;
          return at;
        }
        const slam = easeIn(clamp01((ms - s.arrives - s.charge) / SLAM_MS));
        at.x = s.worker.at.x + side * lerp([WIDE, CLOSE], slam);
        at.y = s.worker.at.y + Math.sin(ms / 25) * (1 - slam) * 2;
        return at;
      };
    });
    const glowAt = (ms: number) => {
      glow.size = PADDLE[0];
      glow.heat = 0;
      for (const s of shocks) {
        if (ms >= s.arrives && ms < s.zaps) {
          const u = (ms - s.arrives) / (s.zaps - s.arrives);
          glow.size = lerp(PADDLE, u);
          glow.heat = u;
        }
      }
      return glow;
    };

    const zapping = createBeats(
      shocks,
      (s) => s.zaps,
      (s, k) => {
        cover!.promote(s.worker);
        if (k === shocks.length - 1) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, k / Math.max(1, shocks.length - 1)));
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
        tick: (ms, now) => zapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of shocks) {
            const t = (ms - s.zaps) / ZAP_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, 0.8);
            drawStrike(ctx, s.worker.at, 1 - t, 1, now);
          }
          const { size, heat } = glowAt(ms);
          for (const paddle of paddles)
            drawWispBetween(
              ctx,
              paddle,
              ms,
              now,
              WISP_SIZE * size,
              heat,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
