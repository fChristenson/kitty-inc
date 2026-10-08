// the "Eddies" event (money; cash): it covers its crit, whose click
// freezes the screen while a broad river of cash surges across the screen
// past a wisp standing in it like a rock in a stream; behind the rock it
// sheds swirling eddies of cash, one above the stream, one below, each a
// jolt, spinning downstream ever bigger like a vortex street, then whirling
// up into the total, the last in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";

const KEY = "eddies";
const REWARD = 4;
const EDDIES = 7;
const EDDY_COINS = 110;
const HEIGHT = 0.55;
const ROCK_AT = 0.18;
const END_AT = 0.85;
const WAVE = 30;
// each eddy drifts out from the stream and swells as it goes
const DRIFT: [number, number] = [30, 120];
const SWELL: [number, number] = [30, 110];
const SPIN = 0.012;
const SPEED = 1.8;
const COIN = 0.5;
const ROCK = 0.9;
const SHED_SHAKE: [number, number] = [0.3, 0.8];

interface Eddy {
  sheds: number;
  // where it reaches the end of its run, and lands in the total
  leaves: number;
  lands: number;
  side: number;
  turn: number;
  out: Point;
  up: Point;
}

export const forceEddiesEvent = registerWispEvent(
  KEY,
  "Eddies",
  () => CONFIG.eddiesEvent.chance,
  (floor, context, area) => {
    const { shedMs, riverMs, liftMs, holdMs, mergeMs } = CONFIG.eddiesEvent;
    const total = totalSpot(area);
    const width = area.right - area.left;
    const y = area.top + (area.bottom - area.top) * HEIGHT;
    const rock: Point = { x: area.left + width * ROCK_AT, y };
    const end = area.left + width * END_AT;
    const run = (end - rock.x) / SPEED;
    const river = sampleLine(
      (u) => ({
        x: lerp([area.left - 40, area.right + 40], u),
        y: y + Math.sin(u * Math.PI * 4) * WAVE * u,
      }),
      40,
    );
    const pour: Pour = {
      coinsAlong: 380,
      width: 46,
      streamMs: riverMs,
      travelMs: 800,
    };
    const eddies: Eddy[] = Array.from({ length: EDDIES }, (_, j) => {
      const sheds = 200 + j * shedMs;
      const leaves = sheds + run;
      const side = j % 2 === 0 ? -1 : 1;
      return {
        sheds,
        leaves,
        lands: leaves + liftMs,
        side,
        turn: -side,
        out: { x: end, y: y + side * DRIFT[1] },
        up: { x: end, y: total.y + 200 },
      };
    });
    const last = eddies[eddies.length - 1];
    const travel = last.lands + 60;
    const centre: Point = { x: 0, y: 0 };
    // the eddy's middle at ms, and how far it has swollen
    const eddyAt = (e: Eddy, ms: number): number => {
      const u = clamp01((ms - e.sheds) / run);
      centre.x = rock.x + (end - rock.x) * u;
      centre.y = y + e.side * lerp(DRIFT, smoothstep(u));
      if (ms <= e.leaves) return lerp(SWELL, u);
      // whirled up into the total, tightening as it goes
      const v = easeIn(clamp01((ms - e.leaves) / liftMs));
      bezier(e.out, e.up, total, v, centre);
      return SWELL[1] * (1 - v);
    };
    const rockAt = () => rock;
    const paths: CoinPath[] = eddies.flatMap((e) =>
      Array.from({ length: EDDY_COINS }, () => {
        const r = Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        return (f: number) => {
          const ms = f * travel;
          if (ms < e.sheds) return { x: rock.x, y: rock.y, scale: 0 };
          const radius = eddyAt(e, ms) * r;
          const spin = a + e.turn * (ms - e.sheds) * SPIN;
          const grow = easeOut(clamp01((ms - e.sheds) / 150));
          return {
            x: centre.x + Math.cos(spin) * radius,
            y: centre.y + Math.sin(spin) * radius,
            scale: COIN * grow,
          };
        };
      }),
    );

    const flowing = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, river, pour),
    );
    const shedding = createBeats(
      eddies,
      (e) => e.sheds,
      (_, k) => {
        cover!.burst(rock, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SHED_SHAKE, k / (EDDIES - 1)));
      },
    );
    const landing = createBeats(
      eddies,
      (e) => e.lands,
      (e) => {
        if (e === last) cover!.blast(cover!.total() ?? total);
        else cover!.burst(cover!.total() ?? total, 0.5);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flowing.tick(ms, now);
          shedding.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > last.sheds + 300) return;
          drawWisp(ctx, rockAt, ms, now, WISP_SIZE * ROCK, 0.8);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
