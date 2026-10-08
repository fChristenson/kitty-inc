// the "Stampede" event: it covers its crit, whose click freezes the screen
// while a herd of wisps gallops in from off its side along its bottom, every
// hoof-fall kicking up a coin as the screen rumbles; reaching the far side,
// they wheel round one after another and charge up into the total-income
// readout, each hit a flash, a pop and coins bursting out of it, the last a
// huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../../../config";
import { playBloop } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeIn, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "stampede";
const REWARD = 4;
const HERD = 7;
// setting off up to STAGGER_MS apart, in a band ROWS of the screen's height
// up from its bottom, from OFF of its width off its side to TURN of its width
// short of the far side; galloping STRIDE_MS strides HOP of its height high
const STAGGER_MS = 260;
const ROWS: [number, number] = [0.1, 0.28];
const OFF = 0.15;
const TURN = 0.15;
const STRIDE_MS = 150;
const HOP = 0.05;
// rumbling the whole way
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 0.9];
// the wisps, as a share of the screen's width
const WISP = 0.045;
// each hoof-fall: a coin kicked up behind it
const KICK: [number, number] = [40, 120];
// each hit in the total: a burst and a few coins
const HIT_BURST: [number, number] = [0.3, 0.6];
const HIT_COINS = 3;
const HIT_RING: [number, number] = [60, 180];

interface Runner {
  from: number;
  y: number;
  turnAt: number;
  hitAt: number;
  path: (ms: number) => Point | null;
}

export const forceStampedeEvent = registerWispEvent(
  KEY,
  "Stampede",
  () => CONFIG.stampedeEvent.chance,
  (floor, context, area) => {
    const { runMs, chargeMs, holdMs, mergeMs } = CONFIG.stampedeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startX =
      dir === 1 ? area.left - width * OFF : area.right + width * OFF;
    const turnX =
      dir === 1 ? area.right - width * TURN : area.left + width * TURN;

    const herd: Runner[] = Array.from({ length: HERD }, (_, i) => {
      const from = (i / (HERD - 1)) * STAGGER_MS * (0.7 + 0.3 * Math.random());
      const y = area.bottom - height * between(ROWS);
      const turnAt = from + runMs;
      const hitAt = turnAt + chargeMs;
      const point = { x: 0, y: 0 };
      const runner: Runner = {
        from,
        y,
        turnAt,
        hitAt,
        path: (ms) => {
          if (ms < from || ms >= hitAt) return null;
          if (ms < turnAt) {
            const u = (ms - from) / runMs;
            point.x = startX + (turnX - startX) * u;
            point.y =
              y -
              height *
                HOP *
                Math.abs(Math.sin((Math.PI * (ms - from)) / STRIDE_MS));
            return point;
          }
          const total = cover?.total();
          if (!total) return null;
          // wheeling up round a bend into the total
          const u = easeIn((ms - turnAt) / chargeMs);
          const cx = turnX + dir * width * 0.1;
          const cy = y - height * 0.5;
          const v = 1 - u;
          point.x = v * v * turnX + 2 * u * v * cx + u * u * total.x;
          point.y = v * v * y + 2 * u * v * cy + u * u * total.y;
          return point;
        },
      };
      return runner;
    });
    const order = [...herd].sort((a, b) => a.hitAt - b.hitAt);
    const lastHit = order[HERD - 1].hitAt;
    const lastTurn = Math.max(...herd.map((r) => r.turnAt));

    // every hoof-fall, a coin kicked up behind
    const falls: { at: number; runner: Runner }[] = [];
    for (const r of herd)
      for (let ms = r.from + STRIDE_MS; ms < r.turnAt; ms += STRIDE_MS)
        falls.push({ at: ms, runner: r });
    let lastRumble = -Infinity;
    const hooves = createBeats(
      falls,
      (f) => f.at,
      (f, k) => kicked(f.runner, f.at, k),
    );
    const hits = createBeats(
      order,
      (r) => r.hitAt,
      (_, n) => hit(n),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastHit + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hooves.tick(ms, now);
          hits.tick(ms, now);
          if (
            ms < lastTurn &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / lastTurn)));
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / lastHit);
          for (const r of herd)
            drawWispBetween(ctx, r.path, ms, now, size, heat, r.from, r.hitAt);
        },
      },
    );
    if (!cover) return;

    function kicked(r: Runner, ms: number, k: number): void {
      const x = startX + ((turnX - startX) * (ms - r.from)) / runMs;
      if (x < area.left || x > area.right) return;
      const at = { x, y: r.y };
      cover!.launchFrom(at, [
        { x: x - dir * between(KICK), y: r.y - between(KICK) * 0.6 },
      ]);
      if (cover!.isLive() && k % 4 === 0) playBloop();
    }
    function hit(n: number): void {
      const total = cover!.total();
      if (!total) return;
      if (n === HERD - 1) {
        cover!.blast(total);
        return;
      }
      cover!.burst(total, lerp(HIT_BURST, n / (HERD - 2)));
      cover!.launchFrom(total, ringTargets(total, HIT_COINS, HIT_RING));
      if (cover!.isLive()) playBloop();
    }
  },
);
