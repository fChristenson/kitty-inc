// the "Bonanza" event (drill; cash): it covers its crit, whose click
// freezes the screen while a mountain of cash pours down out of the sky
// into a heap in the middle of the screen; a drill screams down onto its
// peak and stalls, grinding and juddering as sparks gush out of both sides
// and coins geyser out of the hole and shower down its flanks; then it
// bores down shove by shove, each shove another spurt of cash, and punches
// out of the heap's foot in a blast; the whole heap then surges up into
// the total, the last of it in a huge blast. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../shared/drill";
import { heapSpots } from "../../shared/clutter";
import type { CoinPath } from "../coins";
import { totalSpot } from "../cashFlow";

const KEY = "bonanza";
const REWARD = 4;
const COINS = 700;
// the heap's foot down the screen, its width and its height (shares)
const FOOT = 0.62;
const WIDTH = 0.7;
const HEIGHT = 0.5;
const DROP = 500;
// coins this close to the bore (a share of the heap's width) geyser out
const BORE = 0.1;
const SPURT_LIFT: [number, number] = [220, 480];
const SPURT_MS = 420;
const PUSHES = 8;
const EXIT = 140;
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];
const THROUGH_SHAKE = 1.4;

export const forceBonanzaEvent = registerWispEvent(
  KEY,
  "Bonanza",
  () => CONFIG.bonanzaEvent.chance,
  (floor, context, area) => {
    const {
      pileMs,
      approachMs,
      stallMs,
      boreMs,
      drainMs,
      liftMs,
      holdMs,
      mergeMs,
    } = CONFIG.bonanzaEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const foot: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + h * FOOT,
    };
    const heapW = w * WIDTH;
    const heapH = Math.min(heapW * HEIGHT, h * 0.3);
    const heap = heapSpots(foot, COINS, heapW, heapH);
    const peak: Point = { x: foot.x, y: foot.y - heapH };
    const drill = planDrill(
      { x: peak.x, y: Math.max(area.top - 80, peak.y - 600) },
      peak,
      {
        approachMs,
        boreMs,
        pushes: PUSHES,
        reach: heapH,
        exit: EXIT,
        startMs: pileMs * 0.6,
      },
    );
    const grind = planGrind(drill, stallMs);
    const { bites, pushes, rumbles, through, endMs } = grind;
    const drainAt = through + 120;
    const inAt = Math.max(drainAt + drainMs, through + 30 + SPURT_MS) + liftMs;
    const travelMs = inAt;

    const paths: CoinPath[] = heap.map((spot) => {
      // the low ones land first, the heap piling up
      const height = (foot.y - spot.y) / heapH;
      const lands =
        pileMs * (0.35 + 0.65 * height) * (0.85 + 0.15 * Math.random());
      const falls = lands - pileMs * 0.35;
      const sky: Point = { x: spot.x, y: spot.y - DROP };
      // those in the bore's way geyser out as the drill reaches them
      const inBore = Math.abs(spot.x - foot.x) < heapW * BORE;
      const spurts = inBore
        ? lerp([bites, through], 1 - height) + (Math.random() - 0.5) * 60
        : Infinity;
      const side =
        spot.x < foot.x || (spot.x === foot.x && Math.random() < 0.5) ? -1 : 1;
      const landing: Point = {
        x: foot.x + side * heapW * (0.3 + 0.3 * Math.random()),
        y: foot.y - Math.random() * heapH * 0.2,
      };
      const lift = lerp(SPURT_LIFT, Math.random());
      const rest = inBore ? landing : spot;
      const drains = Math.max(
        drainAt + Math.random() * drainMs,
        inBore ? spurts + SPURT_MS : 0,
      );
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < falls) return { x: sky.x, y: sky.y, scale: 0 };
        if (ms < lands) {
          const u = easeIn((ms - falls) / (lands - falls));
          return { x: spot.x, y: lerp([sky.y, spot.y], u) };
        }
        if (ms < spurts) return { x: spot.x, y: spot.y };
        if (ms < spurts + SPURT_MS) {
          const u = (ms - spurts) / SPURT_MS;
          return {
            x: lerp([spot.x, landing.x], u),
            y: lerp([spot.y, landing.y], u) - 4 * lift * u * (1 - u),
          };
        }
        if (ms < drains) return { x: rest.x, y: rest.y };
        const to = total();
        const p = bezier(
          rest,
          { x: rest.x, y: to.y },
          to,
          easeIn(clamp01((ms - drains) / liftMs)),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: ms >= drains + liftMs ? 0 : 1 };
      };
    });

    const piling = createBeats(
      [pileMs * 0.4, pileMs * 0.8],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(RUMBLE_SHAKE * 2);
      },
    );
    const hitting = createBeats(
      [bites],
      (ms) => ms,
      () => {
        cover!.burst(peak, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const breaking = createBeats(
      [through, drainAt],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k === 1) {
          playSwoosh();
          return;
        }
        cover!.burst(foot, 0.9);
        playExplosion();
        shakeScreen(THROUGH_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(total()),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          piling.tick(ms, now);
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 600) return;
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
