// the "Hummingbird" event: it covers its crit, whose click freezes the screen
// while a wisp zips out of the clicked floor's button like a hummingbird,
// hovering in a buzzing blur at one spot then darting in a blink to the next,
// all over the screen, each stop a pop, a jolt and a ring of coins, the
// stops ever shorter; then it darts into the total-income readout in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "hummingbird";
const REWARD = 4;
// the stops: STOPS of them, scattered over the screen (as shares across and
// down, give or take JITTER), each hovered at for less than the last
const STOPS: Point[] = [
  { x: 0.25, y: 0.62 },
  { x: 0.72, y: 0.48 },
  { x: 0.3, y: 0.34 },
  { x: 0.8, y: 0.7 },
  { x: 0.55, y: 0.56 },
  { x: 0.18, y: 0.45 },
  { x: 0.7, y: 0.3 },
];
const JITTER = 0.05;
// hovering it buzzes BUZZ px about its stop
const BUZZ = 4;
const WISP = 0.055;
const STOP_COINS = 12;
const STOP_REACH: [number, number] = [25, 70];
const STOP_SHAKE: [number, number] = [0.7, 1.6];
const STOP_BURST = 0.5;

export const forceHummingbirdEvent = registerWispEvent(
  KEY,
  "Hummingbird",
  () => CONFIG.hummingbirdEvent.chance,
  (floor, context, area) => {
    const { dartMs, hoverMs, holdMs, mergeMs } = CONFIG.hummingbirdEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const flip = Math.random() < 0.5;
    const stops = STOPS.map((s) => ({
      x:
        area.left +
        width * ((flip ? 1 - s.x : s.x) + (Math.random() - 0.5) * JITTER),
      y: area.top + height * (s.y + (Math.random() - 0.5) * JITTER),
    }));
    // [arrive, leave] at each stop: a dart there, then a hover
    let clock = 0;
    const visits = stops.map((at, k) => {
      const arrive = clock + dartMs;
      const leave = arrive + lerp(hoverMs, k / (stops.length - 1));
      clock = leave;
      return { at, arrive, leave };
    });
    const inAt = clock + dartMs;
    const into = { x: 0, y: 0 };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= inAt) return null;
      const k = visits.findIndex((v) => ms < v.leave);
      const from =
        k <= 0
          ? k === 0
            ? button
            : visits[visits.length - 1].at
          : visits[k - 1].at;
      const to = k < 0 ? (cover?.total() ?? fallback) : visits[k].at;
      const departed =
        k <= 0
          ? k === 0
            ? 0
            : visits[visits.length - 1].leave
          : visits[k - 1].leave;
      const u = clamp01((ms - departed) / dartMs);
      if (u < 1) {
        const e = easeOutCubic(u);
        into.x = from.x + (to.x - from.x) * e;
        into.y = from.y + (to.y - from.y) * e;
        return into;
      }
      into.x = to.x + Math.sin(ms * 0.9) * BUZZ;
      into.y = to.y + Math.sin(ms * 1.4) * BUZZ;
      return into;
    };

    const stopping = createBeats(
      visits,
      (v) => v.arrive,
      (v, k) => {
        const t = k / (visits.length - 1);
        cover!.burst(v.at, STOP_BURST);
        cover!.launchFrom(v.at, ringTargets(v.at, STOP_COINS, STOP_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, t));
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          stopping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * WISP),
            clamp01(ms / inAt),
            0,
            inAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
