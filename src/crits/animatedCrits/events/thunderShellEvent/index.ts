// the "Thunder Shell" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while firework shells rocket up out
// of the clicked floor's button one after another and burst high over the
// workers into stars of forking lightning, every burst a blinding flash, a
// crack and a jolt, its arms cracking down onto the workers below, who climb
// a perma tier; each shell quicker than the last, the last bursting in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "thunderShell";
const MAX_WORKERS = 6;
// workers per shell
const GROUP = 2;
const ABOVE = 260;
const ARMS = 5;
const ARM: [number, number] = [120, 200];
const SHELL = 0.6;
const FLASH_MS = 320;
const BURST_SHAKE: [number, number] = [0.7, 1.4];

interface Shell {
  workers: RewardWorker[];
  burst: Point;
  fires: number;
  bursts: number;
  bolts: Bolt[];
  at: (ms: number) => Point;
}

export const forceThunderShellEvent = registerWispEvent(
  KEY,
  "Thunder Shell",
  () => CONFIG.thunderShellEvent.chance,
  (floor, context, area) => {
    const { shellsMs, riseMs, holdMs, mergeMs } = CONFIG.thunderShellEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const groups: RewardWorker[][] = [];
    for (let i = 0; i < workers.length; i += GROUP)
      groups.push(workers.slice(i, i + GROUP));
    let clock = 0;
    const shells: Shell[] = groups.map((group, k) => {
      const fires = clock;
      clock += lerp(shellsMs, k / Math.max(1, groups.length - 1));
      const x = group.reduce((s, w) => s + w.at.x, 0) / group.length;
      const y = Math.min(...group.map((w) => w.at.y));
      const burst: Point = { x, y: Math.max(area.top + 80, y - ABOVE) };
      // a star of arms, plus one cracking down onto each worker
      const bolts = [
        ...Array.from({ length: ARMS }, (_, i) => {
          const a = (i / ARMS) * Math.PI * 2 + Math.random() * 0.6;
          const r = lerp(ARM, Math.random());
          return createBolt(
            burst,
            { x: burst.x + Math.cos(a) * r, y: burst.y + Math.sin(a) * r },
            0,
          );
        }),
        ...group.map((w) => createBolt(burst, w.at, 1)),
      ];
      const spot: Point = { x: 0, y: 0 };
      return {
        workers: group,
        burst,
        fires,
        bursts: fires + riseMs,
        bolts,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - fires) / riseMs));
          spot.x = lerp([button.x, burst.x], u);
          spot.y = lerp([button.y, burst.y], u);
          return spot;
        },
      };
    });
    const last = shells[shells.length - 1];
    const endAt = last.bursts;

    const bursting = createBeats(
      shells,
      (s) => s.bursts,
      (s, k) => {
        for (const w of s.workers) cover!.promote(w);
        if (s === last) {
          cover!.blast(s.burst);
          return;
        }
        cover!.burst(s.burst, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / Math.max(1, shells.length - 1)));
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
        tick: (ms, now) => bursting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          for (const s of shells) {
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              1,
              s.fires,
              s.bursts,
            );
            const since = ms - s.bursts;
            if (since < 0 || since >= FLASH_MS) continue;
            const fade = 1 - since / FLASH_MS;
            for (const bolt of s.bolts) drawBolt(ctx, bolt, fade, 0.8);
            drawStrike(ctx, s.burst, fade, 1.4, now);
            for (const w of s.workers) drawStrike(ctx, w.at, fade, 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
