// the "Chaos Game" event (experiment: the chaos game drawing Sierpinski's
// triangle; cash): it covers its crit, whose click freezes the screen and
// dims it while three corner wisps light up in a great triangle; a pen wisp
// hops halfway towards a corner picked at random, again and again, leaving a
// gold dot every time, first hop by hop, then faster and faster until
// thousands of dots pour out and the triangle-of-triangles fractal appears
// out of the noise, a jolt with every surge; then the whole fractal bursts
// into cash in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "chaosGame";
const REWARD = 4;
const DOTS = 9000;
// the first hops shown one by one, then the rest pour out
const SLOW_HOPS = 10;
const RES = 0.5;
const DOT = 3;
const MARGIN = 70;
const VEIL = "rgba(0,0,0,0.6)";
const CORNER = 0.6;
const PEN = 0.35;
const SURGES = 4;
const BURST_DOTS = 140;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

export const forceChaosGameEvent = registerWispEvent(
  KEY,
  "Chaos Game",
  () => CONFIG.chaosGameEvent.chance,
  (floor, context, area) => {
    const { hopMs, pourMs, holdMs, mergeMs } = CONFIG.chaosGameEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const side = Math.min(
      width - MARGIN * 2,
      ((height - MARGIN * 2) * 2) / Math.sqrt(3),
    );
    const cx = left + width / 2;
    const cy = top + height / 2;
    const h = (side * Math.sqrt(3)) / 2;
    const corners: Point[] = [
      { x: cx, y: cy - h / 2 },
      { x: cx - side / 2, y: cy + h / 2 },
      { x: cx + side / 2, y: cy + h / 2 },
    ];
    const xs = new Float32Array(DOTS);
    const ys = new Float32Array(DOTS);
    let x = cx;
    let y = cy;
    for (let i = 0; i < DOTS; i++) {
      const c = corners[Math.floor(Math.random() * 3)];
      x = (x + c.x) / 2;
      y = (y + c.y) / 2;
      xs[i] = x;
      ys[i] = y;
    }
    const slowEnds = SLOW_HOPS * hopMs;
    const endAt = slowEnds + pourMs;
    // how many dots are down by ms: one per hop, then a quickening flood
    const dotsAt = (ms: number) => {
      if (ms < slowEnds) return Math.floor(Math.max(0, ms) / hopMs);
      const u = clamp01((ms - slowEnds) / pourMs);
      return Math.min(DOTS, SLOW_HOPS + Math.floor((DOTS - SLOW_HOPS) * u * u));
    };
    const pen: Point = { x: cx, y: cy };
    const penAt = (ms: number): Point => {
      const i = Math.min(DOTS - 1, Math.max(0, dotsAt(ms) - 1));
      pen.x = xs[i];
      pen.y = ys[i];
      return pen;
    };
    const cornerSpots = corners.map((c) => () => c);

    let canvas: HTMLCanvasElement | null = null;
    let drawn = 0;
    const hopping = createBeats(
      Array.from({ length: SLOW_HOPS }, (_, k) => (k + 1) * hopMs),
      (ms) => ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => slowEnds + pourMs * Math.sqrt((k + 1) / (SURGES + 1)),
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (let j = 0; j < BURST_DOTS; j++) {
          const i = Math.floor(Math.random() * DOTS);
          const at: Point = { x: xs[i], y: ys[i] };
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 3, [20, 80]),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        cover!.blast({ x: cx, y: cy });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hopping.tick(ms, now);
          surging.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.width = Math.ceil(width * RES);
            canvas.height = Math.ceil(height * RES);
          }
          // only the dots new since last frame go onto the layer
          const upTo = dotsAt(ms);
          if (upTo > drawn) {
            const g = canvas.getContext("2d")!;
            g.fillStyle = COLOR.heavenlyGold;
            for (let i = drawn; i < upTo; i++)
              g.fillRect(
                (xs[i] - left) * RES - DOT / 2,
                (ys[i] - top) * RES - DOT / 2,
                DOT,
                DOT,
              );
            drawn = upTo;
          }
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(canvas, left, top, width, height);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= endAt) return;
          for (const c of cornerSpots)
            drawWisp(ctx, c, ms, now, WISP_SIZE * CORNER, 0.8);
          if (ms < slowEnds + 200)
            drawWispBetween(
              ctx,
              penAt,
              ms,
              now,
              WISP_SIZE * PEN,
              1,
              0,
              slowEnds + 200,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
