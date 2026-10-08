// the "Knight's Tour" event (experiment: a chess knight's moves; free
// hires): it covers its crit, whose click freezes the screen while a wisp
// hops off the clicked floor's button and moves like a chess knight, every
// move an L: a hop along, a tap and a hop up or down at a sharp right
// angle, landing with a clack on an empty spot on a floor in view where a
// new worker forms: hired for free with a pop and a jolt; move after move,
// ever faster; the last landing goes off in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "knightsTour";
const MAX_HIRES = 5;
const FORM_MS = 300;
// each leg hops HOP px high; it lands RAISE px over the hire's feet
const HOP = 40;
const RAISE = 30;
const KNIGHT = 0.6;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceKnightsTourEvent = registerWispEvent(
  KEY,
  "Knight's Tour",
  () => CONFIG.knightsTourEvent.chance,
  (floor, context) => {
    const { legsMs, holdMs, mergeMs } = CONFIG.knightsTourEvent;
    const found = findRewardHires(floor, context);
    const button = getButtonCenter(context.isGroundFloor);
    // visit the spots nearest first
    const hires = found
      .sort(
        (a, b) =>
          Math.hypot(a.x - button.x, a.y - button.y) -
          Math.hypot(b.x - button.x, b.y - button.y),
      )
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    // every move is two legs: along, then up or down
    const legs: { from: Point; to: Point; starts: number; ends: number }[] = [];
    const moves: { hire: (typeof hires)[number]; spot: Point; at: number }[] =
      [];
    let here: Point = button;
    let clock = 0;
    hires.forEach((hire, k) => {
      const leg = lerp(legsMs, k / Math.max(1, hires.length - 1));
      const spot: Point = { x: hire.x, y: hire.y - RAISE };
      const corner: Point = { x: spot.x, y: here.y };
      legs.push({ from: here, to: corner, starts: clock, ends: clock + leg });
      clock += leg;
      legs.push({ from: corner, to: spot, starts: clock, ends: clock + leg });
      clock += leg;
      moves.push({ hire, spot, at: clock });
      here = spot;
    });
    const endAt = clock;
    const taps = legs.filter((_, i) => i % 2 === 0).map((l) => l.ends);
    const knightAt: Point = { x: 0, y: 0 };
    const knight = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      let i = 0;
      while (i < legs.length - 1 && ms > legs[i].ends) i++;
      const l = legs[i];
      const u = smoothstep((ms - l.starts) / (l.ends - l.starts));
      knightAt.x = lerp([l.from.x, l.to.x], u);
      knightAt.y = lerp([l.from.y, l.to.y], u) - Math.sin(Math.PI * u) * HOP;
      return knightAt;
    };

    const tapping = createBeats(
      taps,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      moves,
      (m) => m.at,
      (m, k) => {
        giveHire(m.hire);
        if (k === moves.length - 1) {
          cover!.blast(m.spot);
          return;
        }
        cover!.burst(m.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, moves.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          tapping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            knight,
            ms,
            now,
            WISP_SIZE * KNIGHT,
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
  (floor, context) => findRewardHires(floor, context).length > 0,
);
