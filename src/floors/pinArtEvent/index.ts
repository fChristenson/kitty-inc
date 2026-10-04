// the "Pin Art" event (experiment: the screen as a pin-art toy; cash): it
// covers its crit, whose click freezes the screen and it turns out to be a
// bed of pins: something pushes along behind it and the pins pop out
// toward you in its wake, a raised trail snaking across the screen; every
// few moments it punches through, popping out a big round patch of pins
// with a jolt and a spray of cash; then the whole bed bulges out in a wave
// from the middle and slams back flat in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "pinArt";
const REWARD = 4;
const COLS = 12;
const ROWS = 18;
// how far a fully raised pin pops out toward you, and how much it grows
const LIFT = 14;
const GROW = 0.1;
const SHADE = "rgba(0,0,0,0.45)";
const TRAIL = 120;
const PUNCH = 320;
// raised pins sink back at this share of their height per ms
const SINK = 0.0012;
const PUNCHES = 5;
const SPRAY = 24;
const WAVE_MS = 260;
const PUNCH_SHAKE: [number, number] = [0.5, 1.1];

export const forcePinArtEvent = registerWispEvent(
  KEY,
  "Pin Art",
  () => CONFIG.pinArtEvent.chance,
  (floor, context, area) => {
    const { traceMs, waveMs, holdMs, mergeMs } = CONFIG.pinArtEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const pw = width / COLS;
    const ph = height / ROWS;
    const lift = new Float32Array(COLS * ROWS);
    // the push behind the screen loops round it in a figure of eight
    const pusher: Point = { x: 0, y: 0 };
    const pushAt = (ms: number): Point => {
      const u = clamp01(ms / traceMs);
      pusher.x = mid.x + Math.sin(u * Math.PI * 4) * width * 0.36;
      pusher.y = mid.y + Math.sin(u * Math.PI * 2 + 0.4) * height * 0.32;
      return pusher;
    };
    const punches = Array.from({ length: PUNCHES }, (_, k) => {
      const ms = (traceMs * (k + 0.8)) / (PUNCHES + 0.3);
      const at = pushAt(ms);
      return { ms, at: { x: at.x, y: at.y } };
    });
    const waveAt = traceMs;
    const slamAt = waveAt + waveMs;
    let last = 0;

    let shot: ScreenCopy | null = null;
    const punching = createBeats(
      punches,
      (p) => p.ms,
      (p, k) => {
        // raise a round patch of pins at once
        for (let i = 0; i < lift.length; i++) {
          const x = left + ((i % COLS) + 0.5) * pw;
          const y = top + (Math.floor(i / COLS) + 0.5) * ph;
          const d = Math.hypot(x - p.at.x, y - p.at.y);
          if (d < PUNCH) lift[i] = Math.max(lift[i], 1 - (d / PUNCH) ** 2);
        }
        cover!.launchFrom(
          p.at,
          clampTargetsY(
            ringTargets(p.at, SPRAY, [80, 260]),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUNCH_SHAKE, k / (PUNCHES - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        lift.fill(0);
        cover!.blast(mid);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: slamAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          punching.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= slamAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          const dt = Math.max(0, t - last);
          last = t;
          const push = t < traceMs ? pushAt(t) : null;
          // the bulge rolls out from the middle, then everything is up
          const wave =
            t >= waveAt ? easeOut(clamp01((t - waveAt) / WAVE_MS)) : 0;
          const reach = wave * Math.hypot(width, height) * 0.6;
          for (let i = 0; i < lift.length; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = left + col * pw;
            const y = top + row * ph;
            let h = Math.max(0, lift[i] - SINK * dt);
            if (push) {
              const d = Math.hypot(x + pw / 2 - push.x, y + ph / 2 - push.y);
              if (d < TRAIL) h = Math.max(h, 1 - d / TRAIL);
            }
            if (
              wave > 0 &&
              Math.hypot(x + pw / 2 - mid.x, y + ph / 2 - mid.y) < reach
            )
              h = 1;
            lift[i] = h;
            if (h < 0.02) continue;
            // a raised pin: its shadow, then the pin nearer and a touch bigger
            const out = h * LIFT;
            const grow = 1 + h * GROW;
            ctx.fillStyle = SHADE;
            ctx.globalAlpha = h;
            ctx.fillRect(x + out * 0.4, y + out * 0.6, pw, ph);
            ctx.globalAlpha = 1;
            const w = pw * grow;
            const hh = ph * grow;
            drawScreenPart(
              ctx,
              shot,
              x,
              y,
              pw,
              ph,
              x + pw / 2 - w / 2 - out,
              y + ph / 2 - hh / 2 - out,
              w,
              hh,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
