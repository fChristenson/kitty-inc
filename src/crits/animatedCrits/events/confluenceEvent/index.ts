// the "Confluence" event: it covers its crit, whose click freezes the screen
// while rivers of cash pour in from off its sides and bottom one after
// another, each winding in to the same spot in the middle, where they crash
// together in a splash and a jolt and swell into one fat roaring river that
// surges up into the total (see ../moneyCover's flow and ../riverPaths)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { FLOW_FLIGHT_MS } from "../../moneyCover";
import { pathsAlong } from "../../riverPaths";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "confluence";
const REWARD = 4;
// coins along each tributary while it's full, START_WIDTH px across where it
// enters
const COINS_ALONG = 380;
const START_WIDTH = 70;
const END_PAUSE_MS = 100;
// where the tributaries enter, as shares of the screen (x, y), from off its
// edges; mirrored at random
const SOURCES: Point[] = [
  { x: -0.08, y: 0.3 },
  { x: 1.08, y: 0.5 },
  { x: -0.08, y: 0.8 },
  { x: 1.08, y: 0.88 },
  { x: 0.3, y: 1.06 },
];
// they meet JOIN of the screen's height down, winding WIND of its width
// either side of a straight line on the way
const JOIN = 0.55;
const WIND = 0.08;
// each arrival: a splash and a jolt
const SPLASH: [number, number] = [0.5, 1];
const SPLASH_SHAKE: [number, number] = [0.6, 1.6];
const STEPS = 60;

export const forceConfluenceEvent = registerWispEvent(
  KEY,
  "Confluence",
  () => CONFIG.confluenceEvent.chance,
  (floor, context, area) => {
    const { staggerMs, pourMs, travelMs } = CONFIG.confluenceEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const flip = Math.random() < 0.5;
    const at = (p: Point): Point => {
      const x = area.left + width * (flip ? 1 - p.x : p.x);
      return { x, y: area.top + height * p.y };
    };
    const join = {
      x: (area.left + area.right) / 2 + between([-0.08, 0.08]) * width,
      y: area.top + height * JOIN,
    };
    const end = { x: (area.left + area.right) / 2, y: area.top + 90 };
    const trunkBend = {
      x: join.x + between([-0.2, 0.2]) * width,
      y: (join.y + end.y) / 2,
    };
    const startAt = SOURCES.map((_, k) => k * staggerMs);
    const durationMs =
      startAt[SOURCES.length - 1] +
      pourMs +
      travelMs * 1.03 +
      FLOW_FLIGHT_MS +
      END_PAUSE_MS;

    // each tributary winds to the meeting, then rides the shared trunk up
    const lines = SOURCES.map((s) => {
      const source = at(s);
      const dx = join.x - source.x;
      const dy = join.y - source.y;
      const d = Math.hypot(dx, dy) || 1;
      const waves = between([1, 2]);
      const wind = width * WIND * (Math.random() < 0.5 ? 1 : -1);
      const line: Point[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const u = i / STEPS;
        const off =
          wind * Math.sin(Math.PI * 2 * waves * u) * Math.sin(Math.PI * u);
        line.push({
          x: source.x + dx * u - (dy / d) * off,
          y: source.y + dy * u + (dx / d) * off,
        });
      }
      for (let i = 1; i <= STEPS; i++)
        line.push(bezier(join, trunkBend, end, i / STEPS, { x: 0, y: 0 }));
      return line;
    });
    // how far along its line (by length) a tributary reaches the meeting
    const meetShare = (line: Point[]) => {
      let tributary = 0;
      let total = 0;
      for (let i = 1; i < line.length; i++) {
        const step = Math.hypot(
          line[i].x - line[i - 1].x,
          line[i].y - line[i - 1].y,
        );
        total += step;
        if (i <= STEPS) tributary += step;
      }
      return tributary / total;
    };

    const arrivals = createBeats(
      startAt,
      (ms, k) => ms + travelMs * meetShare(lines[k]),
      (_, k) => {
        const t = k / (SOURCES.length - 1);
        cover!.burst(join, lerp(SPLASH, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, t));
      },
    );
    const pours = createBeats(
      lines,
      (_, k) => startAt[k],
      (line) => {
        if (!cover!.isLive()) return;
        const count = Math.round((COINS_ALONG * pourMs) / travelMs);
        cover!.cover.flow(
          pathsAlong(line, count, START_WIDTH),
          pourMs,
          travelMs,
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs: 0 },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pours.tick(ms, now);
          arrivals.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
