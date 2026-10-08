// the "Formation" event (wisp): it covers its crit, whose click freezes the
// screen while a flight of wisps bursts out of the clicked floor's button and
// snaps from one formation to the next like a drill team, a ring, a square,
// a triangle, each snap a flash, a bloop, a jolt and coins flung out of the
// middle; then they lock into an arrow pointing at the total-income readout
// and fire into it from the tip back, the last in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../cashFlow)
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
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "formation";
const REWARD = 4;
const WISPS = 10;
// the formations, centered DROP of the screen's height under its middle,
// RADIUS of its width (or height, if less) across
const DROP = 0.06;
const RADIUS = 0.3;
const WISP = 0.045;
const FIRE_GAP_MS = 45;
const SNAP_COINS = [14, 18, 22, 26];
const SNAP_REACH: [number, number] = [30, 110];
const SNAP_SHAKE: [number, number] = [0.9, 1.8];
const SNAP_BURST: [number, number] = [0.5, 1];
const HIT_BURST = 0.5;

// n points evenly round a closed outline through corners (unit space)
function aroundOutline(corners: Point[], n: number): Point[] {
  const sides = corners.map((a, i) => {
    const b = corners[(i + 1) % corners.length];
    return { a, b, len: Math.hypot(b.x - a.x, b.y - a.y) };
  });
  const perimeter = sides.reduce((sum, s) => sum + s.len, 0);
  return Array.from({ length: n }, (_, k) => {
    let d = (k / n) * perimeter;
    for (const s of sides) {
      if (d <= s.len)
        return {
          x: s.a.x + ((s.b.x - s.a.x) * d) / s.len,
          y: s.a.y + ((s.b.y - s.a.y) * d) / s.len,
        };
      d -= s.len;
    }
    return corners[0];
  });
}

// the formations in unit space round (0, 0); the last is the arrow, its
// points listed tip first
const SHAPES: Point[][] = [
  Array.from({ length: WISPS }, (_, k) => ({
    x: Math.cos((k / WISPS) * Math.PI * 2),
    y: Math.sin((k / WISPS) * Math.PI * 2),
  })),
  aroundOutline(
    [
      { x: -0.8, y: -0.8 },
      { x: 0.8, y: -0.8 },
      { x: 0.8, y: 0.8 },
      { x: -0.8, y: 0.8 },
    ],
    WISPS,
  ),
  aroundOutline(
    [
      { x: 0, y: -1 },
      { x: 0.95, y: 0.7 },
      { x: -0.95, y: 0.7 },
    ],
    WISPS,
  ),
  [
    { x: 0, y: -1 },
    { x: -0.3, y: -0.7 },
    { x: 0.3, y: -0.7 },
    { x: -0.6, y: -0.4 },
    { x: 0.6, y: -0.4 },
    { x: 0, y: -0.55 },
    { x: 0, y: -0.1 },
    { x: 0, y: 0.25 },
    { x: 0, y: 0.6 },
    { x: 0, y: 0.95 },
  ],
];

export const forceFormationEvent = registerWispEvent(
  KEY,
  "Formation",
  () => CONFIG.formationEvent.chance,
  (floor, context, area) => {
    const { snapMs, holdShapeMs, fireMs, holdMs, mergeMs } =
      CONFIG.formationEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const centre = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const r = Math.min(width, height) * RADIUS;
    const spots = SHAPES.map((shape) =>
      shape.map((p) => ({ x: centre.x + p.x * r, y: centre.y + p.y * r })),
    );
    // each formation snapped into at, from the button first
    const snaps = SHAPES.map((_, k) => k * (snapMs + holdShapeMs));
    const fireFrom = snaps[snaps.length - 1] + snapMs + holdShapeMs;
    const arrivals = Array.from(
      { length: WISPS },
      (_, k) => fireFrom + k * FIRE_GAP_MS + fireMs,
    );
    const lastIn = arrivals[WISPS - 1];
    const wisps = Array.from({ length: WISPS }, (_, k) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= arrivals[k]) return null;
        const leave = fireFrom + k * FIRE_GAP_MS;
        if (ms >= leave) {
          const from = spots[spots.length - 1][k];
          const total = cover?.total() ?? fallback;
          const u = easeIn(clamp01((ms - leave) / fireMs));
          into.x = from.x + (total.x - from.x) * u;
          into.y = from.y + (total.y - from.y) * u;
          return into;
        }
        let s = 0;
        while (s + 1 < snaps.length && ms >= snaps[s + 1]) s++;
        const from = s === 0 ? button : spots[s - 1][k];
        const to = spots[s][k];
        const u = easeOutBack(clamp01((ms - snaps[s]) / snapMs));
        into.x = from.x + (to.x - from.x) * u;
        into.y = from.y + (to.y - from.y) * u;
        return into;
      };
    });

    const snapping = createBeats(
      snaps,
      (ms) => ms + snapMs,
      (_, k) => {
        const t = k / (snaps.length - 1);
        cover!.burst(centre, lerp(SNAP_BURST, t));
        cover!.launchFrom(
          centre,
          ringTargets(centre, SNAP_COINS[k], SNAP_REACH),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SNAP_SHAKE, t));
      },
    );
    const hits = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === WISPS - 1) cover!.blast(at);
        else cover!.burst(at, HIT_BURST);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          snapping.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = Math.max(WISP_SIZE, width * WISP);
          wisps.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              size,
              clamp01(ms / fireFrom),
              0,
              arrivals[k],
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
