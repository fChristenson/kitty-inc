// the "Glissando" event (experiment: the frozen screen as piano keys; cash):
// it covers its crit, whose click freezes the screen and it splits into
// tall keys; a glissando sweeps across them, left to right then back,
// faster each run, every key it passes pressing down into shadow and
// springing back with a bloop and a coin flicked off its top; then every
// key slams down at once and springs back in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "glissando";
const REWARD = 4;
const KEYS = 14;
const RUNS = 4;
const PRESS = 22;
const PRESS_MS = 180;
const SHADE = 0.45;
const GAP = 3;
const COINS = 4;
const BLOOP_GAP_MS = 60;
const RUN_SHAKE: [number, number] = [0.3, 0.9];

export const forceGlissandoEvent = registerWispEvent(
  KEY,
  "Glissando",
  () => CONFIG.glissandoEvent.chance,
  (floor, context, area) => {
    const { runsMs, slamMs, holdMs, mergeMs } = CONFIG.glissandoEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const keyW = width / KEYS;
    const presses: { key: number; at: number }[] = [];
    let clock = 60;
    for (let r = 0; r < RUNS; r++) {
      const run = lerp(runsMs, r / (RUNS - 1));
      for (let i = 0; i < KEYS; i++) {
        const key = r % 2 === 0 ? i : KEYS - 1 - i;
        presses.push({ key, at: clock + (run * i) / KEYS });
      }
      clock += run;
    }
    const slamAt = clock + 80;
    for (let i = 0; i < KEYS; i++) presses.push({ key: i, at: slamAt });
    const endAt = slamAt + slamMs;
    const depth = (key: number, ms: number) => {
      let p = 0;
      for (const press of presses) {
        if (press.key !== key) continue;
        const t = (ms - press.at) / (press.at === slamAt ? slamMs : PRESS_MS);
        if (t > 0 && t < 1)
          p = Math.max(
            p,
            Math.sin(Math.PI * t) * (press.at === slamAt ? 1.6 : 1),
          );
      }
      return p;
    };
    const runStarts = Array.from(
      { length: RUNS },
      (_, r) => presses[r * KEYS].at,
    );
    let lastBloop = -Infinity;

    let shot: ScreenCopy | null = null;
    const pressing = createBeats(
      presses.slice(0, RUNS * KEYS),
      (p) => p.at,
      (p) => {
        const at = { x: left + (p.key + 0.5) * keyW, y: top + 60 };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, [40, 160], Math.PI / 2, Math.PI * 0.6),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive() || p.at - lastBloop < BLOOP_GAP_MS) return;
        lastBloop = p.at;
        playBloop();
      },
    );
    const running = createBeats(
      runStarts,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(lerp(RUN_SHAKE, k / (RUNS - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.8);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast({ x: left + width / 2, y: top + height / 2 }),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pressing.tick(ms, now);
          running.tick(ms, now);
          slamming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = COLOR.black;
          ctx.fillRect(left, top, width, height);
          for (let k = 0; k < KEYS; k++) {
            const p = depth(k, ms);
            const x = left + k * keyW;
            const y = top + p * PRESS;
            drawScreenPart(
              ctx,
              shot,
              x,
              top,
              keyW - GAP,
              height,
              x,
              y,
              keyW - GAP,
              height,
            );
            if (p > 0) {
              ctx.globalAlpha = Math.min(1, SHADE * p);
              ctx.fillStyle = COLOR.black;
              ctx.fillRect(x, y, keyW - GAP, height);
              ctx.globalAlpha = 1;
            }
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
