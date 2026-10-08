// the "Kaleidoscope" event: it covers its crit, whose click freezes the screen
// while six wisps burst out of the screen's middle in a perfect six-fold
// flower and swing back in, petal after petal, each one wider and faster and
// turned half a petal from the last, like a kaleidoscope; every petal tip a
// flash and a coin from each wisp, every meeting in the middle a pop and a
// jolt. Then they all slam together in the middle in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../moneyCover)
import { CONFIG } from "../../../../config";
import { playBloop } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "kaleidoscope";
const REWARD = 4;
const WISPS = 6;
// petals, each reaching REACH of the screen's width (or height, if less) out
// (growing) and turning the flower TURN rad
const PETALS = 7;
const REACH: [number, number] = [0.22, 0.44];
const TURN = Math.PI / WISPS;
// the wisps, as a share of the screen's width
const WISP = 0.045;
// each tip: a burst and a coin tossed on out from each wisp
const TIP_BURST: [number, number] = [0.15, 0.3];
const TOSS: [number, number] = [30, 110];
// each meeting in the middle: a burst and a jolt
const MEET_BURST: [number, number] = [0.3, 0.6];
const MEET_SHAKE: [number, number] = [0.5, 1.4];

export const forceKaleidoscopeEvent = registerWispEvent(
  KEY,
  "Kaleidoscope",
  () => CONFIG.kaleidoscopeEvent.chance,
  (floor, context, area) => {
    const { petalMs, holdMs, mergeMs } = CONFIG.kaleidoscopeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const span = Math.min(width, height);
    const size = Math.max(WISP_SIZE, width * WISP);
    const turn0 = Math.random() * Math.PI * 2;

    // each petal's start, out and back
    const starts: number[] = [];
    let at = 0;
    for (let k = 0; k <= PETALS; k++) {
      starts.push(at);
      if (k < PETALS) at += lerp(petalMs, k / (PETALS - 1));
    }
    const endAt = at;
    const petalOf = (ms: number) => {
      for (let k = 0; k < PETALS; k++)
        if (ms < starts[k + 1])
          return { k, u: (ms - starts[k]) / (starts[k + 1] - starts[k]) };
      return { k: PETALS - 1, u: 1 };
    };
    const spotOf = (i: number, ms: number, into: Point): Point => {
      const { k, u } = petalOf(ms);
      const r = span * lerp(REACH, k / (PETALS - 1)) * Math.sin(Math.PI * u);
      const angle = turn0 + (i / WISPS) * Math.PI * 2 + (k + u) * TURN;
      into.x = middle.x + Math.cos(angle) * r;
      into.y = middle.y + Math.sin(angle) * r;
      return into;
    };
    const paths = Array.from({ length: WISPS }, (_, i) => {
      const point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < 0 || ms >= endAt ? null : spotOf(i, ms, point);
    });

    // tips halfway through each petal, meetings at each petal's end
    const tips = createBeats(
      starts.slice(0, -1).map((s, k) => (s + starts[k + 1]) / 2),
      (ms) => ms,
      (ms, k) => tipped(ms, k),
    );
    const meets = createBeats(
      starts.slice(1),
      (ms) => ms,
      (_, k) => met(k),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          tips.tick(ms, now);
          meets.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const path of paths)
            drawWispBetween(ctx, path, ms, now, size, heat, 0, endAt);
        },
      },
    );
    if (!cover) return;

    function tipped(ms: number, k: number): void {
      const t = k / (PETALS - 1);
      for (let i = 0; i < WISPS; i++) {
        const tip = spotOf(i, ms, { x: 0, y: 0 });
        cover!.burst(tip, lerp(TIP_BURST, t));
        const out = between(TOSS);
        const dx = tip.x - middle.x;
        const dy = tip.y - middle.y;
        const d = Math.hypot(dx, dy) || 1;
        cover!.launchFrom(tip, [
          { x: tip.x + (dx / d) * out, y: tip.y + (dy / d) * out },
        ]);
      }
    }
    function met(k: number): void {
      if (k === PETALS - 1) {
        cover!.blast(middle);
        return;
      }
      const t = k / (PETALS - 2);
      cover!.burst(middle, lerp(MEET_BURST, t));
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(MEET_SHAKE, t));
    }
  },
);
