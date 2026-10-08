// the "Bead Lightning" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a colossal bolt cracks down the
// whole height of the screen in a blinding flash, a crack and a jolt; as it
// fades its channel breaks up into a string of glowing beads like real bead
// lightning, which peel off one after another and zip down onto the
// workers, each landing a strike and a jolt as they climb a perma tier, the
// stray beads fizzling out; the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "beadLightning";
const MAX_WORKERS = 6;
const STRAYS = 4;
const SWAY = 50;
const FLASH_MS = 160;
const FADE_MS = 360;
const BEAD = 0.45;
const STRAY = 0.3;
const STRIKE_SHAKE = 1.4;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

interface Bead {
  worker: RewardWorker | null;
  home: Point;
  peels: number;
  lands: number;
  at: (ms: number) => Point;
}

export const forceBeadLightningEvent = registerWispEvent(
  KEY,
  "Bead Lightning",
  () => CONFIG.beadLightningEvent.chance,
  (floor, context, area) => {
    const { beadsAtMs, peelsMs, zipMs, holdMs, mergeMs } =
      CONFIG.beadLightningEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const x = (area.left + area.right) / 2;
    const top: Point = { x, y: area.top - 20 };
    const bottom: Point = { x, y: area.bottom + 20 };
    const bolt = createBolt(top, bottom, 3);
    const count = workers.length + STRAYS;
    // beads strung down the channel, the strays mixed in among them
    const order = Array.from({ length: count }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    );
    let clock: number = beadsAtMs;
    const beads: Bead[] = order.map((slot, i) => {
      const home: Point = {
        x: x + Math.sin(slot * 1.7) * SWAY,
        y: lerp([area.top + 80, area.bottom - 80], (slot + 0.5) / count),
      };
      const worker = i < workers.length ? workers[i] : null;
      const peels = clock;
      clock += lerp(peelsMs, i / (count - 1));
      const spot: Point = { x: 0, y: 0 };
      const to = worker ? worker.at : home;
      return {
        worker,
        home,
        peels,
        lands: peels + (worker ? zipMs : zipMs * 0.6),
        at: (ms) => {
          const u = smoothstep(clamp01((ms - peels) / zipMs));
          spot.x = lerp([home.x, to.x], u);
          spot.y = lerp([home.y, to.y], u);
          return spot;
        },
      };
    });
    const landed = beads.filter((b) => b.worker);
    const last = landed.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = Math.max(...beads.map((b) => b.lands));

    const striking = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst({ x, y: (area.top + area.bottom) / 2 }, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(STRIKE_SHAKE);
      },
    );
    const landing = createBeats(
      beads,
      (b) => b.lands,
      (b) => {
        if (!b.worker) {
          cover!.burst(b.home, 0.25);
          if (cover!.isLive()) playBloop();
          return;
        }
        cover!.promote(b.worker);
        if (b === last) {
          cover!.blast(b.worker.at);
          return;
        }
        cover!.burst(b.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, b.lands / endAt));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: Math.max(endAt, last.lands) + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          striking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          if (ms < FADE_MS) {
            const flash = ms < FLASH_MS ? 1.6 : 1;
            drawBolt(ctx, bolt, 1 - ms / FADE_MS, flash);
          }
          for (const b of beads) {
            // the beads glow in along the channel as the bolt fades
            if (ms < beadsAtMs * 0.5) continue;
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * (b.worker ? BEAD : STRAY),
              1,
              beadsAtMs * 0.5,
              b.lands,
            );
            if (b.worker && ms >= b.lands && ms < b.lands + 260)
              drawStrike(ctx, b.worker.at, 1 - (ms - b.lands) / 260, 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
