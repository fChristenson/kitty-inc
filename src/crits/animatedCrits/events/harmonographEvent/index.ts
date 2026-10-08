// the "Harmonograph" event (experiment: a harmonograph's pendulums drawing;
// cash): it covers its crit, whose click freezes the screen and dims it while
// a pen wisp, swung by two dying pendulums, starts to draw: a looping gold
// line of ever-shifting ellipses, faster and faster, the figure winding in
// on itself into an intricate rosette, a jolt at every surge; then the whole
// drawing bursts into cash in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "harmonograph";
const REWARD = 4;
const POINTS = 3000;
// pendulum time drawn, in radians of the slowest swing
const SPAN = 70;
const DECAY = 0.012;
const RES = 0.5;
const LINE = 2;
const MARGIN = 60;
const VEIL = "rgba(0,0,0,0.6)";
const PEN = 0.35;
const SURGES = 4;
const BURST_POINTS = 140;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

export const forceHarmonographEvent = registerWispEvent(
  KEY,
  "Harmonograph",
  () => CONFIG.harmonographEvent.chance,
  (floor, context, area) => {
    const { drawMs, holdMs, mergeMs } = CONFIG.harmonographEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const ax = width / 2 - MARGIN;
    const ay = Math.min(height / 2 - MARGIN, ax * 1.2);
    // two pendulums a side, nearly in tune, so the figure drifts and winds in
    const f = [
      1,
      between([1.98, 2.02]),
      between([1.48, 1.52]),
      between([2.98, 3.02]),
    ];
    const p = f.map(() => Math.random() * Math.PI * 2);
    const xs = new Float32Array(POINTS);
    const ys = new Float32Array(POINTS);
    for (let i = 0; i < POINTS; i++) {
      const t = (i / (POINTS - 1)) * SPAN;
      const d = Math.exp(-DECAY * t);
      xs[i] =
        cx +
        ax * 0.5 * d * (Math.sin(f[0] * t + p[0]) + Math.sin(f[1] * t + p[1]));
      ys[i] =
        cy +
        ay * 0.5 * d * (Math.sin(f[2] * t + p[2]) + Math.sin(f[3] * t + p[3]));
    }
    const endAt = drawMs;
    // how far along the line the pen is: slow at first, then racing
    const drawnAt = (ms: number) =>
      Math.min(
        POINTS - 1,
        Math.floor((POINTS - 1) * clamp01(ms / drawMs) ** 1.8),
      );
    const pen: Point = { x: xs[0], y: ys[0] };
    const penAt = (ms: number): Point => {
      const i = drawnAt(Math.max(0, ms));
      pen.x = xs[i];
      pen.y = ys[i];
      return pen;
    };

    let canvas: HTMLCanvasElement | null = null;
    let drawn = 0;
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => drawMs * ((k + 1) / (SURGES + 1)) ** 0.6,
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
        for (let j = 0; j < BURST_POINTS; j++) {
          const i = Math.floor(Math.random() * POINTS);
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
          // only the stretch of line new since last frame goes onto the layer
          const upTo = drawnAt(ms);
          if (upTo > drawn) {
            const g = canvas.getContext("2d")!;
            g.strokeStyle = COLOR.heavenlyGold;
            g.lineWidth = LINE;
            g.lineJoin = "round";
            g.beginPath();
            g.moveTo((xs[drawn] - left) * RES, (ys[drawn] - top) * RES);
            for (let i = drawn + 1; i <= upTo; i++)
              g.lineTo((xs[i] - left) * RES, (ys[i] - top) * RES);
            g.stroke();
            drawn = upTo;
          }
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade * clamp01(ms / 150);
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.globalAlpha = fade;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(canvas, left, top, width, height);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, penAt, ms, now, WISP_SIZE * PEN, 1, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
