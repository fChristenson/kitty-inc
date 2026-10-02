// the "Glitch" event (an experiment beyond the four templates: the frozen
// screen itself glitches): it covers its crit, whose click freezes the
// screen while it starts to glitch like a crashing video, bands of it
// tearing sideways and flashing colour, each burst a buzz, a jolt and coins
// spilling out of the tear, faster and faster until it's all torn up; then
// it reboots in a white flash and a huge blast and shake that sprays cash
// everywhere, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "glitch";
const REWARD = 4;
// GLITCHES bursts, each BURST_MS long, tearing BANDS bands (more each time)
// up to TEAR of the screen's width sideways, BAND of its height tall
const GLITCHES = 10;
const BURST_MS = 90;
const BANDS: [number, number] = [2, 7];
const TEAR: [number, number] = [0.04, 0.16];
const BAND: [number, number] = [0.02, 0.07];
const TINTS = [
  "rgba(255,0,140,0.28)",
  "rgba(0,220,255,0.28)",
  "rgba(255,230,0,0.22)",
];
const TEAR_COINS = 14;
const TEAR_REACH: [number, number] = [30, 100];
const TEAR_SHAKE: [number, number] = [0.8, 1.9];
const REBOOT_COINS = 360;
const REBOOT_REACH: [number, number] = [0.08, 0.6];

export const forceGlitchEvent = registerWispEvent(
  KEY,
  "Glitch",
  () => CONFIG.glitchEvent.chance,
  (floor, context, area) => {
    const { gapsMs, holdMs, mergeMs } = CONFIG.glitchEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock = 0;
    // each burst's torn bands, planned up front
    const glitches = Array.from({ length: GLITCHES }, (_, k) => {
      const t = k / (GLITCHES - 1);
      const at = clock;
      clock += lerp(gapsMs, t);
      const bands = Array.from({ length: Math.round(lerp(BANDS, t)) }, () => ({
        y: area.top + height * between([0.1, 0.92]),
        h: height * between(BAND),
        dx:
          width *
          lerp(TEAR, t) *
          (Math.random() < 0.5 ? -1 : 1) *
          between([0.4, 1]),
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      }));
      return { at, t, bands };
    });
    const rebootAt = clock;

    const bursts = createBeats(
      glitches,
      (g) => g.at,
      (g) => {
        const band = g.bands[0];
        const at = {
          x: area.left + width * between([0.2, 0.8]),
          y: band.y + band.h / 2,
        };
        cover!.launchFrom(at, sprayTargets(at, TEAR_COINS, TEAR_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TEAR_SHAKE, g.t));
      },
    );
    const reboot = createBeats(
      [rebootAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        cover!.burst(mid, 3);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            sprayTargets(mid, REBOOT_COINS, [
              span * REBOOT_REACH[0],
              span * REBOOT_REACH[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: rebootAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bursts.tick(ms, now);
          reboot.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= rebootAt) return;
          // copies torn bands of what's on screen back over it, shifted
          const m = ctx.getTransform();
          for (const g of glitches) {
            const since = ms - g.at;
            if (since < 0 || since >= BURST_MS) continue;
            const jitter = 0.6 + 0.4 * Math.random();
            for (const b of g.bands) {
              const sx = m.a * area.left + m.e;
              const sy = m.d * b.y + m.f;
              const sw = m.a * width;
              const sh = m.d * b.h;
              if (sw <= 0 || sh <= 0) continue;
              ctx.drawImage(
                ctx.canvas,
                sx,
                sy,
                sw,
                sh,
                area.left + b.dx * jitter,
                b.y,
                width,
                b.h,
              );
              ctx.fillStyle = b.tint;
              ctx.fillRect(area.left, b.y, width, b.h);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
