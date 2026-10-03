// the "Sower" event (mix; free hires and cash): it covers its crit, whose
// click freezes the screen while a sower wisp sweeps out of the clicked
// floor's button and glides across the building, scattering arcs of cash
// down as it passes over every empty spot on the floors in view; each
// scattering lands with a flash, a bloop and a jolt and a new worker sprouts
// from it; the last sprouts in a huge blast and shake. Pays floor income ×
// floor number × REWARD, plus the hires
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { alongRoute, bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  pointAlong,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "sower";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
// it glides HIGH px over the spots, scattering arcs SCATTER_MS long
const HIGH = 130;
const SCATTER_MS = 320;
const SOWER = 0.45;
const SPROUT_SHAKE: [number, number] = [0.5, 1.2];

export const forceSowerEvent = registerWispEvent(
  KEY,
  "Sower",
  () => CONFIG.sowerEvent.chance,
  (floor, context) => {
    const { glideMs, holdMs, mergeMs } = CONFIG.sowerEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const route: Point[] = [
      button,
      ...hires.map((h) => ({ x: h.x, y: h.y - HIGH })),
    ];
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 160);
    const along = measure(line);
    const length = along[along.length - 1];
    const pour: Pour = {
      coinsAlong: 300,
      width: 22,
      streamMs: 220,
      travelMs: SCATTER_MS,
    };
    const scatters = hires.map((hire) => {
      const over: Point = { x: hire.x, y: hire.y - HIGH };
      const spot: Point = { x: hire.x, y: hire.y - 20 };
      let best = 0;
      let bestD = Infinity;
      line.forEach((p, i) => {
        const d = Math.hypot(p.x - over.x, p.y - over.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      const passes = (along[best] / length) * glideMs;
      const ctrl: Point = { x: over.x + 40, y: over.y - 40 };
      const arc = sampleLine(
        (u) => bezier(over, ctrl, spot, u, { x: 0, y: 0 }),
        24,
      );
      return { hire, spot, arc, passes, lands: passes + SCATTER_MS };
    });
    const last = scatters.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.passes, pour),
      endAt + holdMs + mergeMs,
    );
    const at: Point = { x: 0, y: 0 };
    const sower = (ms: number): Point | null =>
      ms > glideMs ? null : pointAlong(line, along, ms / glideMs, at);

    const scattering = createBeats(
      scatters,
      (s) => s.passes,
      (s) => pourLine(cover!, s.arc, pour),
    );
    const sprouting = createBeats(
      scatters,
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPROUT_SHAKE, k / Math.max(1, scatters.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          scattering.tick(ms, now);
          sprouting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            sower,
            ms,
            now,
            WISP_SIZE * SOWER,
            0.5,
            0,
            glideMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
