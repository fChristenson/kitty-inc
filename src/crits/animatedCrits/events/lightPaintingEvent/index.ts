// the "Light Painting" event (beam; cash): it covers its crit, whose click
// freezes the screen while a wisp swoops out of the clicked floor's button
// and paints the air like a long-exposure photo, every stretch of its
// looping path left blazing behind it as a beam of light, every sharp turn a
// flash, a pop and a jolt; when the painting is done it flares white-hot and
// bursts into coins all along it in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "lightPainting";
const REWARD = 4;
// the brush traces a Lissajous figure LOBES_X by LOBES_Y, sampled into
// STROKES strokes
const LOBES_X = 3;
const LOBES_Y = 2;
const STROKES = 64;
const LEAD = 4;
const PAINT = 8;
const FLARE_MS = 350;
const TURNS = 6;
const BRUSH = 0.5;
const BURSTS = 12;
const COINS = 10;
const COIN_REACH: [number, number] = [30, 110];
const TURN_SHAKE: [number, number] = [0.3, 1];

export const forceLightPaintingEvent = registerWispEvent(
  KEY,
  "Light Painting",
  () => CONFIG.lightPaintingEvent.chance,
  (floor, context, area) => {
    const { paintMs, holdMs, mergeMs } = CONFIG.lightPaintingEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 30,
    };
    const ax = (area.right - area.left) * 0.38;
    const ay = (area.bottom - area.top) * 0.3;
    const phase = Math.random() * Math.PI;
    const figure = (u: number): Point => ({
      x: center.x + Math.sin(u * LOBES_X * Math.PI * 2 + phase) * ax,
      y: center.y + Math.sin(u * LOBES_Y * Math.PI * 2) * ay,
    });
    const start = figure(0);
    const points: Point[] = [];
    for (let i = 0; i <= LEAD; i++)
      points.push({
        x: lerp([button.x, start.x], i / LEAD),
        y: lerp([button.y, start.y], i / LEAD),
      });
    for (let i = 1; i <= STROKES; i++) points.push(figure(i / STROKES));
    const last = points.length - 1;
    const timeOf = (i: number) => paintMs * (i / last);
    const turns = Array.from({ length: TURNS }, (_, k) => {
      const i = LEAD + Math.round(((k + 0.5) / TURNS) * STROKES);
      return { at: points[i], ms: timeOf(i) };
    });
    const bursts = Array.from(
      { length: BURSTS },
      (_, k) => points[LEAD + Math.round((k / BURSTS) * STROKES)],
    );
    const endAt = paintMs;
    const brushAt: Point = { x: 0, y: 0 };
    const brush = (ms: number): Point => {
      const f = clamp01(ms / paintMs) * last;
      const i = Math.min(last - 1, Math.floor(f));
      brushAt.x = lerp([points[i].x, points[i + 1].x], f - i);
      brushAt.y = lerp([points[i].y, points[i + 1].y], f - i);
      return brushAt;
    };

    const turning = createBeats(
      turns,
      (t) => t.ms,
      (t, k) => {
        cover!.burst(t.at, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, k / (TURNS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const at of bursts)
          cover!.launchFrom(at, ringTargets(at, COINS, COIN_REACH));
        cover!.blast(center);
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLARE_MS) return;
          const flare = ms > endAt ? 1 - (ms - endAt) / FLARE_MS : 0;
          const done = Math.min(last, Math.floor(clamp01(ms / paintMs) * last));
          for (let i = 1; i <= done; i++)
            drawBeam(
              ctx,
              points[i - 1],
              points[i],
              PAINT * (1 + flare * 1.5),
              ms > endAt ? flare : 0.8,
            );
          if (ms <= endAt) {
            drawBeam(ctx, points[done], brush(ms), PAINT, 0.8);
            drawWispBetween(
              ctx,
              brush,
              ms,
              now,
              WISP_SIZE * BRUSH,
              1,
              0,
              endAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
