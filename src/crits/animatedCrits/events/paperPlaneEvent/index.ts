// the "Paper Plane" event (wisp; a free floor): it covers its crit, whose
// click freezes the screen while a paper-plane wisp is flung off the clicked
// floor's button and goes stunting: a full loop-the-loop, a stall, a
// screaming dive, each stunt a whoosh, a flash and a jolt; then it pulls up
// and spears straight into the building's locked floor in a huge blast and
// shake, and the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "paperPlane";
const LOOP = 90;
const LOOP_POINTS = 8;
const PLANE = 0.5;
const STUNT_SHAKE: [number, number] = [0.5, 1.1];

export const forcePaperPlaneEvent = registerWispEvent(
  KEY,
  "Paper Plane",
  () => CONFIG.paperPlaneEvent.chance,
  (floor, context, area) => {
    const { flightMs, holdMs, mergeMs } = CONFIG.paperPlaneEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const cx = (area.left + area.right) / 2;
    const h = area.bottom - area.top;
    const ltr = button.x < cx;
    const dir = ltr ? 1 : -1;
    // out, round a loop, up into a stall, down in a dive, then into the lock
    const loopHub: Point = { x: cx - dir * 80, y: area.top + h * 0.55 };
    const route: Point[] = [button];
    for (let i = 0; i <= LOOP_POINTS; i++) {
      const a = Math.PI / 2 + dir * (i / LOOP_POINTS) * Math.PI * 2;
      route.push({
        x: loopHub.x + Math.cos(a) * LOOP + dir * i * 6,
        y: loopHub.y + Math.sin(a) * LOOP,
      });
    }
    const stall: Point = { x: cx + dir * 140, y: area.top + h * 0.3 };
    const dive: Point = { x: cx + dir * 60, y: area.top + h * 0.7 };
    route.push(stall, dive, { x: lock.x - dir * 120, y: lock.y + 60 }, lock);
    const last = route.length - 1;
    const timeOf = (i: number) => flightMs * (i / last);
    const stunts = [
      { at: route[1 + LOOP_POINTS / 2], ms: timeOf(1 + LOOP_POINTS / 2) },
      { at: stall, ms: timeOf(route.indexOf(stall)) },
      { at: dive, ms: timeOf(route.indexOf(dive)) },
    ];
    const endAt = flightMs;
    const planeAt: Point = { x: 0, y: 0 };
    const plane = (ms: number): Point =>
      alongRoute(route, clamp01(ms / flightMs), planeAt);

    const stunting = createBeats(
      stunts,
      (s) => s.ms,
      (s, k) => {
        cover!.burst(s.at, 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(STUNT_SHAKE, k / (stunts.length - 1)));
      },
    );
    const landing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          stunting.tick(ms, now);
          landing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              plane,
              ms,
              now,
              WISP_SIZE * PLANE,
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
  (floor, context) => findRewardLocked(floor, context) !== null,
);
