// the "Wall Jump" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a wisp leaps out of the clicked
// floor's button onto the side of the screen and wall-jumps its way up:
// kicking off one side, flying across and slapping into the other, every
// kick level with an income bar, a thud, a flash and a jolt as the bar
// lands free levels; it climbs ever faster, the last kick slamming its bar
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "wallJump";
const MAX_BARS = 6;
const WALL = 30;
const ARC = 90;
const JUMPER = 0.5;
const KICK_SHAKE: [number, number] = [0.5, 1.3];

export const forceWallJumpEvent = registerWispEvent(
  KEY,
  "Wall Jump",
  () => CONFIG.wallJumpEvent.chance,
  (floor, context, area) => {
    const { jumpsMs, holdMs, mergeMs } = CONFIG.wallJumpEvent;
    // the bottom bar first, climbing
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const startSide = button.x > (area.left + area.right) / 2 ? 0 : 1;
    let clock = 0;
    let from: Point = button;
    const kicks = bars.map((bar, k) => {
      const side = (k + startSide) % 2;
      const to: Point = {
        x: side === 0 ? area.left + WALL : area.right - WALL,
        y: bar.center.y,
      };
      const ctrl: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - ARC,
      };
      const leaves = clock;
      clock += lerp(jumpsMs, k / Math.max(1, bars.length - 1));
      const kick = { bar, from, ctrl, to, leaves, lands: clock };
      from = to;
      return kick;
    });
    const last = kicks[kicks.length - 1];
    const endAt = last.lands;
    const jumperAt: Point = { x: 0, y: 0 };
    const jumper = (ms: number): Point => {
      let k = kicks[0];
      for (const kick of kicks) if (ms >= kick.leaves) k = kick;
      return bezier(
        k.from,
        k.ctrl,
        k.to,
        clamp01((ms - k.leaves) / (k.lands - k.leaves)),
        jumperAt,
      );
    };

    const kicking = createBeats(
      kicks,
      (k) => k.lands,
      (k, i) => {
        cover!.levels(k.bar, levelsFor(k.bar.floor), k.to);
        if (k === last) {
          cover!.slam(k.bar);
          cover!.blast(k.to);
          return;
        }
        cover!.burst(k.to, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(KICK_SHAKE, i / Math.max(1, kicks.length - 1)));
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
        tick: (ms, now) => kicking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              jumper,
              ms,
              now,
              WISP_SIZE * JUMPER,
              0.8,
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
