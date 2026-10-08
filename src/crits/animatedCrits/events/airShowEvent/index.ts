// the "Air Show" event: it covers its crit, whose click freezes the screen
// while a V of five wisps roars in low across it like a flying display team,
// each streaming a contrail of cash behind it; the formation pulls up into a
// full loop-the-loop, painting five rings of cash round the middle of the
// screen, then climbs out into the total-income readout, each wisp diving in
// with a flash and a jolt and the last in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
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

const KEY = "airShow";
const REWARD = 4;
// the formation: each wisp's place across the V (in GAP px) and how far it
// trails the leader (in LAG_MS)
const SLOTS = [0, -1, 1, -2, 2];
const GAP = 22;
const LAG_MS = 70;
// the loop: LOOP of the screen's width (or height, if less) across, its middle
// RAISE of the screen's height over the screen's middle
const LOOP = 0.25;
const RAISE = 0.02;
// the wisps, as shares of the screen's width; the leader a touch bigger
const WISP = 0.045;
const LEADER = 1.25;
// each wisp diving into the total: a burst and a jolt
const DIVE_BURST = 0.6;
const DIVE_SHAKE = 1.2;

export const forceAirShowEvent = registerWispEvent(
  KEY,
  "Air Show",
  () => CONFIG.airShowEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.airShowEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const side = Math.random() < 0.5 ? 1 : -1;
    const mid = (area.left + area.right) / 2;
    const r = Math.min(width, height) * LOOP;
    const centre = { x: mid, y: (area.top + area.bottom) / 2 - height * RAISE };
    const bottom = { x: centre.x, y: centre.y + r };
    const entry = {
      x: mid - side * width * 0.65,
      y: area.bottom - height * 0.08,
    };
    const exit = { x: mid + side * width * 0.42, y: bottom.y };
    // in low, round the loop, then out and up
    const base: Point[] = [
      ...sampleLine(
        (u) =>
          bezier(
            entry,
            { x: mid - side * width * 0.2, y: bottom.y + height * 0.05 },
            bottom,
            u,
            { x: 0, y: 0 },
          ),
        30,
      ),
      ...sampleLine((u) => {
        const a = Math.PI / 2 - side * Math.PI * 2 * u;
        return { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r };
      }, 70).slice(1),
      ...sampleLine(
        (u) => bezier(bottom, exit, total, u, { x: 0, y: 0 }),
        40,
      ).slice(1),
    ];
    // each wisp's line, shifted sideways from the leader's
    const lines = SLOTS.map((slot) =>
      base.map((p, i) => {
        const a = base[Math.max(0, i - 1)];
        const b = base[Math.min(base.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        // fading the shift out as it reaches the total
        const fade = Math.min(1, (base.length - 1 - i) / 20);
        return {
          x: p.x - ((b.y - a.y) / len) * slot * GAP * fade,
          y: p.y + ((b.x - a.x) / len) * slot * GAP * fade,
        };
      }),
    );
    const pour: Pour = { coinsAlong: 300, width: 18, streamMs, travelMs };
    const starts = SLOTS.map((slot) => Math.abs(slot) * LAG_MS);
    const heads = lines.map((line, k) => riverHead(line, travelMs, starts[k]));
    const arrivals = starts.map((s) => s + travelMs);
    const lastIn = Math.max(...arrivals);
    const lastWisp = arrivals.lastIndexOf(lastIn);
    const durationMs = Math.max(
      pourDurationMs(Math.max(...starts), pour),
      lastIn + holdMs + mergeMs,
    );

    const takeoffs = createBeats(
      lines,
      (_, k) => starts[k],
      (line) => pourLine(cover!, line, pour),
    );
    // the leader topping the loop
    const loopTop = createBeats(
      [travelMs * 0.45],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const dives = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? total;
        if (k === lastWisp) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, DIVE_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DIVE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          takeoffs.tick(ms, now);
          loopTop.tick(ms, now);
          dives.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = Math.max(WISP_SIZE, width * WISP);
          heads.forEach((head, k) =>
            drawWispBetween(
              ctx,
              head,
              ms,
              now,
              k === 0 ? size * LEADER : size,
              0.6,
              starts[k],
              arrivals[k],
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
