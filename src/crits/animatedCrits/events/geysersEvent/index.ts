// the "Geysers" event: it covers its crit, whose click freezes the screen
// while a row of wisps pops up along the bottom of it, each fizzing and
// trembling; one after another they erupt, each a flash, a bang and a jolt,
// blowing a geyser of cash straight up out of the ground that arcs over into
// the total-income readout with its wisp riding the crest; the last and
// biggest hits the total in a huge blast and shake, and the coins sweep into
// the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "geysers";
const REWARD = 4;
// the vents: GEYSERS across the bottom, LIFT of the screen's height above it,
// spread over SPREAD of its width
const GEYSERS = 5;
const LIFT = 0.07;
const SPREAD = 0.8;
// each blows up PEAK of the screen's height from the top before it arcs over
const PEAK = 0.12;
// the wisps, as shares of the screen's width, growing along the row
const WISP: [number, number] = [0.05, 0.08];
const POP_MS = 160;
const POP_GAP_MS = 60;
const SHIVER = 3;
// each eruption: a burst, a bang and a jolt, growing
const ERUPT_BURST: [number, number] = [0.5, 1];
const ERUPT_SHAKE: [number, number] = [1, 2.2];

export const forceGeysersEvent = registerWispEvent(
  KEY,
  "Geysers",
  () => CONFIG.geysersEvent.chance,
  (floor, context, area) => {
    const { leadMs, gapMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.geysersEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    // erupting from the outside in, so the last is in the middle
    const order = Array.from({ length: GEYSERS }, (_, i) => i).sort(
      (a, b) =>
        Math.abs(b - (GEYSERS - 1) / 2) - Math.abs(a - (GEYSERS - 1) / 2) ||
        a - b,
    );
    const vents = order.map((i, k) => {
      const at: Point = {
        x:
          area.left + width * ((1 - SPREAD) / 2 + (SPREAD * i) / (GEYSERS - 1)),
        y: area.bottom - height * LIFT,
      };
      const bend = { x: at.x, y: area.top + height * PEAK - height * 0.15 };
      const line = sampleLine((u) =>
        bezier(at, bend, total, u, { x: 0, y: 0 }),
      );
      const start = leadMs + k * gapMs;
      return {
        at,
        line,
        start,
        crest: riverHead(line, travelMs, start),
        popAt: k * POP_GAP_MS,
      };
    });
    const pour: Pour = { coinsAlong: 520, width: 64, streamMs, travelMs };
    const last = vents[GEYSERS - 1].start;
    const topAt = last + travelMs;
    const durationMs = Math.max(
      pourDurationMs(last, pour),
      topAt + holdMs + mergeMs,
    );
    const shiver = { x: 0, y: 0 };
    const ventAt =
      (vent: (typeof vents)[number]) =>
      (ms: number): Point | null => {
        if (ms < vent.popAt || ms >= vent.start) return null;
        const t = clamp01((ms - vent.popAt) / (vent.start - vent.popAt));
        shiver.x = vent.at.x + Math.sin(ms * 0.9) * SHIVER * t;
        shiver.y = vent.at.y + Math.sin(ms * 1.3) * SHIVER * t;
        return shiver;
      };
    const waits = vents.map(ventAt);

    const eruptions = createBeats(
      vents,
      (v) => v.start,
      (vent, k) => {
        const t = k / (GEYSERS - 1);
        cover!.burst(vent.at, lerp(ERUPT_BURST, t));
        pourLine(cover!, vent.line, pour);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ERUPT_SHAKE, t));
      },
    );
    const finale = createBeats(
      [topAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          eruptions.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          vents.forEach((vent, k) => {
            const size =
              Math.max(WISP_SIZE, width * lerp(WISP, k / (GEYSERS - 1))) *
              easeOutBack(clamp01((ms - vent.popAt) / POP_MS));
            const heat = clamp01((ms - vent.popAt) / (vent.start - vent.popAt));
            drawWispBetween(
              ctx,
              waits[k],
              ms,
              now,
              size,
              heat,
              vent.popAt,
              vent.start,
            );
            drawWispBetween(
              ctx,
              vent.crest,
              ms,
              now,
              size,
              1,
              vent.start,
              vent.start + travelMs,
            );
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
