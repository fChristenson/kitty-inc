// the "Rainbow" event: it covers its crit, whose click freezes the screen
// while a wisp leaps up off one side of it and arcs right over the top to the
// other, laying a rainbow of five broad bands of flowing cash behind it; it
// lands with a flash and a jolt and becomes the pot at the rainbow's end,
// swelling as the cash pours down into it, then bursts in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor number
// × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";

const KEY = "rainbow";
const REWARD = 4;
// the bands: BANDS of them, GAP of the screen's width (or height, if less)
// apart, the outermost RADIUS across from the arch's middle, whose feet stand
// FEET of the screen's height up from its bottom
const BANDS = 5;
const GAP = 0.045;
const RADIUS = 0.46;
const FEET = 0.2;
// the leader and the pot, as shares of the screen's width
const LEADER = 0.06;
const POT: [number, number] = [0.07, 0.15];
const POP_MS = 200;
const LAND_BURST = 1;
const LAND_SHAKE = 1.8;

export const forceRainbowEvent = registerWispEvent(
  KEY,
  "Rainbow",
  () => CONFIG.rainbowEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.rainbowEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const way = Math.random() < 0.5 ? 1 : -1;
    const centre = {
      x: (area.left + area.right) / 2,
      y: area.bottom - height * FEET,
    };
    const radii = Array.from(
      { length: BANDS },
      (_, k) => span * (RADIUS - GAP * k),
    );
    // each band from one foot, over the top, down to the other
    const bands = radii.map((r) =>
      sampleLine(
        (u) => ({
          x: centre.x - way * Math.cos(Math.PI * u) * r,
          y: centre.y - Math.sin(Math.PI * u) * r,
        }),
        80,
      ),
    );
    const middle = bands[(BANDS - 1) >> 1];
    const pot: Point = middle[middle.length - 1];
    const pour: Pour = { coinsAlong: 320, width: 24, streamMs, travelMs };
    const landAt = travelMs;
    const popAt = streamMs + travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      popAt + holdMs + mergeMs,
    );
    const leader = riverHead(middle, travelMs);
    const potAt = (ms: number): Point | null =>
      ms < landAt || ms >= popAt ? null : pot;

    const land = createBeats(
      [landAt],
      (ms) => ms,
      () => {
        cover!.burst(pot, LAND_BURST);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const finale = createBeats(
      [popAt],
      (ms) => ms,
      () => cover!.blast(pot),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          land.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const lead =
            Math.max(WISP_SIZE, width * LEADER) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, leader, ms, now, lead, 0.6, 0, landAt);
          const fill = clamp01((ms - landAt) / (popAt - landAt));
          drawWispBetween(
            ctx,
            potAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * lerp(POT, fill)),
            fill,
            landAt,
            popAt,
          );
        },
      },
    );
    if (!cover) return;
    for (const band of bands) pourLine(cover, band, pour);
    playBoostEventStream();
  },
);
