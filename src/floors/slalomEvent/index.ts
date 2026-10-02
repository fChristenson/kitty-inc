// the "Slalom" event: it covers its crit, whose click freezes the screen while
// a column of wisp gates pops up down it and the wisp swoops in from its top
// and carves down round them like a skier, ever faster; every gate it rounds
// bursts in a flash, a swish, a jolt and a spray of coins like powder snow;
// it schusses out of the last turn and slams into the clicked floor's button
// in a huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { catmull } from "../../shared/curves";

const KEY = "slalom";
const REWARD = 4;
// gates down the screen from TOP to BOTTOM of its height, SWING of its width
// either side of its middle, rounded WIDE of its width outside
const GATES = 6;
const TOP = 0.12;
const BOTTOM = 0.75;
const SWING = 0.17;
const WIDE = 0.11;
const POP_MS = 200;
// the wisps, as shares of the screen's width
const GATE = 0.045;
const SKIER = 0.055;
// each gate: a burst, a swish, a jolt and coins sprayed out like snow
const GATE_BURST: [number, number] = [0.3, 0.6];
const GATE_SHAKE: [number, number] = [0.5, 1.4];
const GATE_COINS: [number, number] = [3, 5];
const SNOW: [number, number] = [60, 200];
const SNOW_SPAN = 1.3;

export const forceSlalomEvent = registerWispEvent(
  KEY,
  "Slalom",
  () => CONFIG.slalomEvent.chance,
  (floor, context, area) => {
    const { gateMs, holdMs, mergeMs } = CONFIG.slalomEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middleX = (area.left + area.right) / 2;
    const gateSize = Math.max(WISP_SIZE * 0.8, width * GATE);
    const skier = Math.max(WISP_SIZE, width * SKIER);
    const button = getButtonCenter(context.isGroundFloor);
    const first = Math.random() < 0.5 ? 1 : -1;
    const gates: Point[] = Array.from({ length: GATES }, (_, k) => ({
      x: middleX + (k % 2 === 0 ? first : -first) * width * SWING,
      y: area.top + height * lerp([TOP, BOTTOM], k / (GATES - 1)),
    }));
    // round the outside of each gate
    const turns = gates.map((g) => ({
      x: g.x + Math.sign(g.x - middleX) * width * WIDE,
      y: g.y,
    }));
    const route: Point[] = [
      { x: middleX, y: area.top - height * 0.1 },
      ...turns,
      button,
    ];
    const reachAt: number[] = [POP_MS];
    for (let k = 1; k < route.length; k++)
      reachAt.push(reachAt[k - 1] + lerp(gateMs, (k - 1) / (route.length - 2)));
    const blastAt = reachAt[route.length - 1];

    const point = { x: 0, y: 0 };
    const skierAt = (ms: number): Point | null => {
      if (ms < POP_MS || ms >= blastAt) return null;
      let k = 1;
      while (ms >= reachAt[k]) k++;
      const t = (ms - reachAt[k - 1]) / (reachAt[k] - reachAt[k - 1]);
      const a = route[Math.max(0, k - 2)];
      const b = route[k - 1];
      const c = route[k];
      const d = route[Math.min(route.length - 1, k + 1)];
      point.x = catmull(a.x, b.x, c.x, d.x, t);
      point.y = catmull(a.y, b.y, c.y, d.y, t);
      return point;
    };
    // each gate stands until the skier rounds it
    const gatePaths = gates.map(
      (g, k) =>
        (ms: number): Point | null =>
          ms < 0 || ms >= reachAt[k + 1] ? null : g,
    );

    const beats = createBeats(
      reachAt.slice(1),
      (ms) => ms,
      (_, k) => (k === GATES ? cover!.blast(button) : rounded(k)),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          const pop = easeOutBack(clamp01(ms / POP_MS));
          gatePaths.forEach((path, k) =>
            drawWispBetween(
              ctx,
              path,
              ms,
              now,
              gateSize * pop,
              0.3,
              0,
              reachAt[k + 1],
            ),
          );
          drawWispBetween(ctx, skierAt, ms, now, skier, heat, POP_MS, blastAt);
        },
      },
    );
    if (!cover) return;

    function rounded(k: number): void {
      const g = gates[k];
      const t = k / (GATES - 1);
      cover!.burst(g, lerp(GATE_BURST, t));
      cover!.launchFrom(
        g,
        sprayTargets(
          g,
          Math.round(lerp(GATE_COINS, t)),
          SNOW,
          g.x > middleX ? 0 : Math.PI,
          SNOW_SPAN,
        ),
      );
      if (!cover!.isLive()) return;
      playSwoosh();
      shakeScreen(lerp(GATE_SHAKE, t));
    }
  },
);
