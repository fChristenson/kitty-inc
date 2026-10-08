// the "Spool" event (mix; cash): it covers its crit, whose click freezes the
// screen while a spool wisp spins out of the clicked floor's button to the
// middle of the screen and unspools a river of cash round and round in a
// widening spiral out to the edges; with a jolt it reverses and reels the
// whole river back in, spinning faster and tighter, a bang and a shake as
// it winds in tight; then it fires the lot straight up into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
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
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "spool";
const REWARD = 4;
const TURNS = 2.5;
const REACH = 0.38;
const MOVE_MS = 220;
const FIRE_MS = 360;
const STEPS = 120;
const SPOOL = 0.6;

export const forceSpoolEvent = registerWispEvent(
  KEY,
  "Spool",
  () => CONFIG.spoolEvent.chance,
  (floor, context, area) => {
    const { unspoolMs, reelMs, holdMs, mergeMs } = CONFIG.spoolEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const reach =
      Math.min(area.right - area.left, area.bottom - area.top) * REACH;
    const spiral = (u: number): Point => {
      const a = u * Math.PI * 2 * TURNS;
      return {
        x: hub.x + Math.cos(a) * reach * u,
        y: hub.y + Math.sin(a) * reach * u,
      };
    };
    const out = sampleLine(spiral, STEPS);
    const back = sampleLine((u) => spiral(1 - u), STEPS);
    const total = totalSpot(area);
    const fire = sampleLine(
      (u) => ({ x: lerp([hub.x, total.x], u), y: lerp([hub.y, total.y], u) }),
      30,
    );
    const unspool: Pour = {
      coinsAlong: 620,
      width: 26,
      streamMs: unspoolMs * 0.8,
      travelMs: unspoolMs,
    };
    const reel: Pour = {
      coinsAlong: 700,
      width: 26,
      streamMs: reelMs * 0.8,
      travelMs: reelMs,
    };
    const shot: Pour = {
      coinsAlong: 600,
      width: 40,
      streamMs: FIRE_MS * 0.6,
      travelMs: FIRE_MS,
    };
    const reels = MOVE_MS + unspoolMs;
    const fires = reels + reelMs;
    const endAt = fires + FIRE_MS;
    const durationMs = Math.max(
      pourDurationMs(fires, shot),
      endAt + holdMs + mergeMs,
    );
    const outHead = riverHead(out, unspoolMs, MOVE_MS);
    const backHead = riverHead(back, reelMs, reels);
    const spoolAt: Point = { x: 0, y: 0 };
    const spool = (ms: number): Point => {
      if (ms < MOVE_MS) {
        const u = easeOut(clamp01(ms / MOVE_MS));
        spoolAt.x = lerp([button.x, hub.x], u);
        spoolAt.y = lerp([button.y, hub.y], u);
        return spoolAt;
      }
      return (ms < reels ? outHead(ms) : backHead(ms)) ?? hub;
    };

    const pouring = createBeats(
      [
        { ms: MOVE_MS, line: out, pour: unspool },
        { ms: reels, line: back, pour: reel },
        { ms: fires, line: fire, pour: shot },
      ],
      (p) => p.ms,
      (p) => pourLine(cover!, p.line, p.pour),
    );
    const jolting = createBeats(
      [
        { ms: reels, at: out[out.length - 1], shake: 0.8 },
        { ms: fires, at: hub, shake: 1.3 },
      ],
      (j) => j.ms,
      (j) => {
        cover!.burst(j.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(j.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          jolting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= fires)
            drawWispBetween(
              ctx,
              spool,
              ms,
              now,
              WISP_SIZE * SPOOL,
              0.6 + 0.4 * clamp01((ms - reels) / reelMs),
              0,
              fires,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
