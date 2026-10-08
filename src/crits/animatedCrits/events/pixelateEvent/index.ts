// the "Pixelate" event (an experiment beyond the four templates: the frozen
// screen pixelates): it covers its crit, whose click freezes the screen while
// it breaks down into chunky pixels like an old console, the blocks jumping
// bigger and bigger on every beat, each a bloop, a jolt and coins bursting
// out of a block; then it snaps back sharp in a white flash and a huge blast
// and shake that sprays cash everywhere, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "pixelate";
const REWARD = 4;
// the block size (px) after each beat
const BLOCKS = [5, 9, 14, 20, 28, 40];
const BEAT_COINS = 16;
const BEAT_REACH: [number, number] = [25, 80];
const BEAT_SHAKE: [number, number] = [0.9, 2];
const SNAP_COINS = 340;
const SNAP_REACH: [number, number] = [0.08, 0.6];

export const forcePixelateEvent = registerWispEvent(
  KEY,
  "Pixelate",
  () => CONFIG.pixelateEvent.chance,
  (floor, context, area) => {
    const { gapsMs, holdMs, mergeMs } = CONFIG.pixelateEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock = 0;
    const beats = BLOCKS.map((block, k) => {
      const at = clock;
      clock += lerp(gapsMs, k / (BLOCKS.length - 1));
      return { at, block };
    });
    const snapAt = clock;
    // the screen shrunk into this, then blown back up without smoothing
    const small = document.createElement("canvas");
    small.width = Math.ceil(width / BLOCKS[0]) + 1;
    small.height = Math.ceil(height / BLOCKS[0]) + 1;
    const sc = small.getContext("2d")!;

    const beating = createBeats(
      beats,
      (b) => b.at,
      (b, k) => {
        const at = {
          x:
            area.left +
            Math.floor((width * between([0.15, 0.85])) / b.block) * b.block +
            b.block / 2,
          y:
            area.top +
            Math.floor((height * between([0.25, 0.85])) / b.block) * b.block +
            b.block / 2,
        };
        cover!.launchFrom(at, ringTargets(at, BEAT_COINS, BEAT_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEAT_SHAKE, k / (BLOCKS.length - 1)));
      },
    );
    const snap = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        cover!.burst(mid, 3);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            sprayTargets(mid, SNAP_COINS, [
              span * SNAP_REACH[0],
              span * SNAP_REACH[1],
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
      { durationMs: snapAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          beating.tick(ms, now);
          snap.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= snapAt) return;
          const latest = beating.latest();
          if (!latest) return;
          const block = beats[latest.index].block;
          const w = Math.max(1, Math.round(width / block));
          const h = Math.max(1, Math.round(height / block));
          const m = ctx.getTransform();
          sc.clearRect(0, 0, w, h);
          sc.drawImage(
            ctx.canvas,
            m.a * area.left + m.e,
            m.d * area.top + m.f,
            m.a * width,
            m.d * height,
            0,
            0,
            w,
            h,
          );
          const smooth = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, w, h, area.left, area.top, width, height);
          ctx.imageSmoothingEnabled = smooth;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
