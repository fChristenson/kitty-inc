// the "Thunderbird" event (lightning; cash): it covers its crit, whose
// click freezes the screen while a great bird of lightning bursts out of
// the clicked floor's button, its wings two crackling bolts, and swoops
// back and forth across the screen in huge arcs; every downbeat of its
// wings is a thunderclap, a flash, a jolt and coins shaken off its
// wingtips, its wings beating ever faster; then it folds its wings and
// dives into the middle of the screen in a huge blast and shake. Pays
// floor income × floor number × REWARD
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
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt } from "../../../../shared/lightning";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "thunderbird";
const REWARD = 4;
// wings span SPAN px a side, flapping FLAP px; it beats BEATS times, ever
// faster, over its flight
const SPAN = 80;
const FLAP = 50;
const BEATS = 7;
const BODY = 0.8;
const SHED = 5;
const SHED_REACH: [number, number] = [20, 90];
const BEAT_SHAKE: [number, number] = [0.5, 1.2];

export const forceThunderbirdEvent = registerWispEvent(
  KEY,
  "Thunderbird",
  () => CONFIG.thunderbirdEvent.chance,
  (floor, context, area) => {
    const { flightMs, diveMs, holdMs, mergeMs } = CONFIG.thunderbirdEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const center: Point = { x: area.left + w / 2, y: area.top + h / 2 };
    const route: Point[] = [
      button,
      { x: area.left + w * 0.15, y: area.top + h * 0.6 },
      { x: area.left + w * 0.5, y: area.top + h * 0.2 },
      { x: area.left + w * 0.85, y: area.top + h * 0.45 },
      { x: area.left + w * 0.5, y: area.top + h * 0.7 },
      { x: area.left + w * 0.15, y: area.top + h * 0.3 },
      { x: area.left + w * 0.6, y: area.top + h * 0.15 },
    ];
    const diveAt = flightMs;
    const endAt = diveAt + diveMs;
    const from = route[route.length - 1];
    // the wing phase: beats crowd toward the end
    const phase = (ms: number) => BEATS * clamp01(ms / flightMs) ** 0.75;
    const downbeats = Array.from(
      { length: BEATS },
      (_, k) => flightMs * ((k + 0.5) / BEATS) ** (1 / 0.75),
    );
    const body: Point = { x: 0, y: 0 };
    const tips: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const wings = tips.map((tip) => createBolt(body, tip, 1));
    const place = (ms: number) => {
      if (ms < diveAt) alongRoute(route, clamp01(ms / flightMs), body);
      else {
        const u = clamp01((ms - diveAt) / diveMs);
        body.x = lerp([from.x, center.x], u * u);
        body.y = lerp([from.y, center.y], u * u);
      }
      const fold = ms > diveAt ? 1 - clamp01((ms - diveAt) / diveMs) : 1;
      const flap = Math.cos(phase(ms) * Math.PI * 2) * FLAP * fold;
      tips[0].x = body.x - SPAN * fold;
      tips[1].x = body.x + SPAN * fold;
      tips[0].y = tips[1].y = body.y - flap;
      return body;
    };
    const bodyAt: Point = { x: 0, y: 0 };
    const bird = (ms: number): Point | null => {
      if (ms > endAt) return null;
      place(ms);
      bodyAt.x = body.x;
      bodyAt.y = body.y;
      return bodyAt;
    };

    const beating = createBeats(
      downbeats,
      (ms) => ms,
      (ms, k) => {
        place(ms);
        for (const tip of tips) {
          const spot = { x: tip.x, y: tip.y };
          cover!.launchFrom(spot, ringTargets(spot, SHED, SHED_REACH));
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BEAT_SHAKE, k / (BEATS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          beating.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          if (ms <= endAt) {
            place(ms);
            const grow = clamp01(ms / 200);
            for (const wing of wings) drawBolt(ctx, wing, grow, 0.6);
          }
          drawWispBetween(ctx, bird, ms, now, WISP_SIZE * BODY, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
