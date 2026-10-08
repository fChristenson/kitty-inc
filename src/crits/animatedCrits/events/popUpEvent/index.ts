// the "Pop-Up" event (experiment: the frozen screen as a pop-up book; cash):
// it covers its crit, whose click freezes the screen and it splits into
// broad horizontal bands that pop out toward the viewer one after another,
// down the screen and back up, each swelling out of the page over its own
// shadow with a bloop, a jolt and a burst of coins before flopping back
// flat; then every band pops at once and slams flat in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "popUp";
const REWARD = 4;
const BANDS = 6;
const POP = 0.16;
const POP_MS = 320;
const SHADOW = 16;
const SHADOW_FILL = "rgba(0,0,0,0.45)";
const COINS = 12;
const POP_SHAKE: [number, number] = [0.4, 1.1];

export const forcePopUpEvent = registerWispEvent(
  KEY,
  "Pop-Up",
  () => CONFIG.popUpEvent.chance,
  (floor, context, area) => {
    const { popsMs, holdMs, mergeMs } = CONFIG.popUpEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const bandH = height / BANDS;
    // down the screen, then back up, then all at once
    const order = [
      ...Array.from({ length: BANDS }, (_, b) => b),
      ...Array.from({ length: BANDS - 2 }, (_, b) => BANDS - 2 - b),
    ];
    const pops: { band: number; at: number }[] = [];
    let clock = 60;
    order.forEach((band, k) => {
      pops.push({ band, at: clock });
      clock += lerp(popsMs, k / (order.length - 1));
    });
    const allAt = clock;
    for (let b = 0; b < BANDS; b++) pops.push({ band: b, at: allAt });
    const endAt = allAt + POP_MS;
    const bandScale = (band: number, ms: number) => {
      let s = 1;
      for (const p of pops) {
        if (p.band !== band) continue;
        const t = (ms - p.at) / POP_MS;
        if (t > 0 && t < 1)
          s = Math.max(
            s,
            1 +
              (p.at === allAt ? POP * 1.6 : POP) *
                Math.sin(Math.PI * easeOutBack(clamp01(t * 1.2))),
          );
      }
      return s;
    };

    let shot: ScreenCopy | null = null;
    const popping = createBeats(
      pops.slice(0, order.length + 1),
      (p) => p.at,
      (p, k) => {
        const at = { x: left + width / 2, y: top + (p.band + 0.5) * bandH };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, [60, 240], -Math.PI / 2, Math.PI),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, k / order.length));
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
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height,
          );
          // flat bands first, then the popped ones over them, biggest last
          for (let pass = 0; pass < 2; pass++)
            for (let b = 0; b < BANDS; b++) {
              const s = bandScale(b, ms);
              if (s > 1 !== (pass === 1)) continue;
              const y = top + b * bandH;
              const w = width * s;
              const h = bandH * s;
              const x = left + (width - w) / 2;
              const yy = y + (bandH - h) / 2;
              if (s > 1) {
                ctx.fillStyle = SHADOW_FILL;
                ctx.fillRect(
                  x + SHADOW * (s - 1) * 8,
                  yy + SHADOW * (s - 1) * 8,
                  w,
                  h,
                );
              }
              drawScreenPart(ctx, shot, left, y, width, bandH, x, yy, w, h);
            }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
