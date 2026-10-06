// the "Updraft" event (mix; cash): it covers its crit, whose click freezes
// the screen while a column of cash erupts up off the bottom of the screen
// and a glider wisp sweeps in and catches it, corkscrewing up it; at the
// top it peels off and glides across to a second column, erupting as it
// arrives, and corkscrews up that one higher and faster, then a third,
// rising right under the total; off its top the glider shoots into the
// total in a huge blast as all three columns pour in after it. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "updraft";
const REWARD = 4;
// each column: its x and the heights the glider climbs it between, as
// shares of the screen (the last tops out under the total)
const COLUMNS = [
  { x: 0.22, from: 0.85, to: 0.55, turns: 2 },
  { x: 0.78, from: 0.68, to: 0.34, turns: 2.5 },
  { x: 0.5, from: 0.5, to: 0, turns: 3 },
];
// the last column's climb ends this far under the total
const UNDER_TOTAL = 200;
// px the columns sway either side, the glider's circle round them, and how
// much bigger it gets swinging round the front
const SWAY = 40;
const CIRCLE = 110;
const DEPTH = 0.3;
const SAG = 140;
const ENTRY = 160;
// the columns erupt this long before the glider gets there
const LEAD_MS = 160;
// px/ms the cash rises at
const RISE = 1.7;
const COINS_ALONG = 140;
const WIDTH = 90;
const GLIDER = WISP_SIZE * 1.1;
const CATCH_COINS = 8;
const CATCH_RING: [number, number] = [50, 130];
const ERUPT_SHAKE = 0.7;
const CATCH_SHAKE = 0.5;
const LAP_SHAKE: [number, number] = [0.15, 0.4];

export const forceUpdraftEvent = registerWispEvent(
  KEY,
  "Updraft",
  () => CONFIG.updraftEvent.chance,
  (floor, context, area) => {
    const { climbsMs, glideMs, diveMs, holdMs, mergeMs } = CONFIG.updraftEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const yAt = (share: number) => area.top + h * share;

    // the climbs, quickening, each a glide after the last
    let clock = glideMs;
    const climbs = COLUMNS.map((c, k) => {
      const x = area.left + w * c.x;
      const from = yAt(c.from);
      const to =
        k === COLUMNS.length - 1 ? fallback.y + UNDER_TOTAL : yAt(c.to);
      const ms = lerp(climbsMs, k / (COLUMNS.length - 1));
      const start = clock;
      clock += ms + glideMs;
      const line = sampleLine((u) => ({
        x: x + SWAY * Math.sin(u * Math.PI * 2 + k * 1.7),
        y: lerp([area.bottom + 60, to - 60], u),
      }));
      return { x, from, to, turns: c.turns, start, end: start + ms, line };
    });
    const last = climbs[climbs.length - 1];
    const finishMs = last.end + diveMs;
    const pours = climbs.map((c) => {
      const starts = Math.max(0, c.start - LEAD_MS);
      const travelMs = (area.bottom + 60 - (c.to - 60)) / RISE;
      const pour: Pour = {
        coinsAlong: COINS_ALONG,
        width: WIDTH,
        streamMs: finishMs - starts,
        travelMs,
      };
      return { c, starts, pour };
    });
    const endMs = Math.max(
      ...pours.map((p) => pourDurationMs(p.starts, p.pour)),
    );

    // the glider round column c at u 0..1 of its climb, speeding up it
    const round = (c: (typeof climbs)[number], u: number, into: Point) => {
      const phase = u * c.turns * Math.PI * 2;
      into.x = c.x + CIRCLE * Math.sin(phase);
      into.y = lerp([c.from, c.to], easeIn(u) * 0.6 + u * 0.4);
      return into;
    };
    const bottoms = climbs.map((c) => round(c, 0, { x: 0, y: 0 }));
    const tops = climbs.map((c) => round(c, 1, { x: 0, y: 0 }));
    const entry: Point = { x: area.left - ENTRY, y: climbs[0].from + 120 };
    // each glide in, off the screen's edge or the last column's top, sagging
    const glides = climbs.map((_, k) => {
      const from = k === 0 ? entry : tops[k - 1];
      const to = bottoms[k];
      const bow: Point = {
        x: (from.x + to.x) / 2,
        y: Math.max(from.y, to.y) + SAG,
      };
      return { from, bow, to };
    });
    const top = tops[tops.length - 1];
    const diveBow: Point = { x: top.x, y: top.y - 120 };
    const gliderSpot: Point = { x: 0, y: 0 };
    const depthAt = (ms: number) => {
      for (const c of climbs)
        if (ms >= c.start && ms <= c.end) {
          const u = (ms - c.start) / (c.end - c.start);
          return 1 + DEPTH * Math.cos(u * c.turns * Math.PI * 2);
        }
      return 1;
    };
    const gliderAt = (ms: number): Point | null => {
      if (ms < 0 || ms > finishMs) return null;
      for (let k = 0; k < climbs.length; k++) {
        const c = climbs[k];
        if (ms < c.start) {
          const g = glides[k];
          const u = easeOut(clamp01((ms - (c.start - glideMs)) / glideMs));
          return bezier(g.from, g.bow, g.to, u, gliderSpot);
        }
        if (ms <= c.end)
          return round(c, (ms - c.start) / (c.end - c.start), gliderSpot);
      }
      return bezier(
        top,
        diveBow,
        total(),
        easeIn((ms - last.end) / diveMs),
        gliderSpot,
      );
    };
    // a lap's beat each time the glider swings round the column's front
    const laps = climbs.flatMap((c, k) =>
      Array.from({ length: Math.floor(c.turns) }, (_, j) => ({
        ms: lerp([c.start, c.end], (j + 1) / c.turns),
        k,
      })),
    );

    const erupting = createBeats(
      pours,
      (p) => p.starts,
      (p) => {
        pourLine(cover!, p.c.line, p.pour);
        const base: Point = { x: p.c.x, y: area.bottom - 40 };
        cover!.burst(base, 0.7);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(ERUPT_SHAKE);
      },
    );
    const catching = createBeats(
      climbs,
      (c) => c.start,
      (_, k) => {
        const at = bottoms[k];
        cover!.burst(at, 0.45);
        cover!.launchFrom(at, ringTargets(at, CATCH_COINS, CATCH_RING));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CATCH_SHAKE);
      },
    );
    const lapping = createBeats(
      laps,
      (l) => l.ms,
      (l) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAP_SHAKE, l.k / (climbs.length - 1)));
      },
    );
    const finishing = createBeats(
      [finishMs],
      (ms) => ms,
      () => cover!.blast(total()),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          erupting.tick(ms, now);
          catching.tick(ms, now);
          lapping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > finishMs + 400) return;
          drawWisp(ctx, gliderAt, ms, now, GLIDER * depthAt(ms), 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
