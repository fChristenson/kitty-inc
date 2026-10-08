// the "Sheepdog" event (mix): it covers its crit, whose click freezes the
// screen while the clicked floor's button spills a huge herd of cash out
// over the lower screen; a wisp darts round it like a sheepdog, nipping at
// one side then the other, ever faster, and every dart squeezes the herd
// tighter and drives it higher with a flash, a bloop and a jolt; then the
// dog swoops under the packed herd and drives it up into the total-income
// readout in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { alongRoute, bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "sheepdog";
const REWARD = 4;
const COINS = 1_200;
const COIN = 0.75;
const SPILL_FLIGHT_MS = 200;
// the herd's shape after the spill and each dart: its middle as shares of
// the screen up from its foot, and its half-width/half-height as shares of
// the screen's width/height
const HERDS = [
  { up: 0.22, rx: 0.42, ry: 0.12 },
  { up: 0.28, rx: 0.32, ry: 0.11 },
  { up: 0.34, rx: 0.23, ry: 0.1 },
  { up: 0.4, rx: 0.15, ry: 0.09 },
  { up: 0.45, rx: 0.09, ry: 0.07 },
];
const DARTS = HERDS.length - 1;
// how far round the herd the dog dashes to, past its rim
const NIP = 1.35;
const LAG_MS = 90;
const DOG = 0.05;
const MILL = 5;
const DART_BURST: [number, number] = [0.5, 1];
const DART_SHAKE: [number, number] = [0.9, 1.9];

export const forceSheepdogEvent = registerWispEvent(
  KEY,
  "Sheepdog",
  () => CONFIG.sheepdogEvent.chance,
  (floor, context, area) => {
    const {
      spillMs,
      dartGapsMs,
      squeezeMs,
      sweepMs,
      flightMs,
      holdMs,
      mergeMs,
    } = CONFIG.sheepdogEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const mid = (area.left + area.right) / 2;
    const herds = HERDS.map((h) => ({
      x: mid,
      y: area.bottom - height * h.up,
      rx: width * h.rx,
      ry: height * h.ry,
    }));
    const darts: number[] = [];
    let clock = spillMs;
    for (let k = 0; k < DARTS; k++) {
      clock += lerp(dartGapsMs, k / Math.max(1, DARTS - 1));
      darts.push(clock);
    }
    const driveAt = clock + squeezeMs;
    const endAt = driveAt + sweepMs + flightMs;
    // the herd's shape ms in, squeezing from one to the next after each dart
    const herd = { x: 0, y: 0, rx: 0, ry: 0 };
    const herdAt = (ms: number) => {
      let k = 0;
      while (k < DARTS && ms >= darts[k]) k++;
      const from = herds[Math.max(0, k - 1)];
      const to = herds[k];
      const u =
        k === 0 ? 1 : smoothstep(clamp01((ms - darts[k - 1]) / squeezeMs));
      const a = k === 0 ? to : from;
      herd.x = a.x + (to.x - a.x) * u;
      herd.y = a.y + (to.y - a.y) * u;
      herd.rx = a.rx + (to.rx - a.rx) * u;
      herd.ry = a.ry + (to.ry - a.ry) * u;
      return herd;
    };

    // the dog: out of the button, nipping each side in turn, then under the
    // herd and up into the total
    const sideFirst = Math.random() < 0.5 ? -1 : 1;
    const stops: Point[] = herds.slice(0, DARTS).map((h, k) => {
      const side = k % 2 === 0 ? sideFirst : -sideFirst;
      const a = (side < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.9;
      return {
        x: h.x + Math.cos(a) * h.rx * NIP,
        y: h.y + Math.sin(a) * h.ry * NIP * 2,
      };
    });
    const under = {
      x: mid,
      y: herds[DARTS].y + herds[DARTS].ry * 2.2,
    };
    const dog = { x: 0, y: 0 };
    const leg = { x: 0, y: 0 };
    const bend = { x: mid, y: 0 };
    const drive = [stops[DARTS - 1], under, leg];
    const dogAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= endAt) return null;
      if (ms < darts[0]) {
        const u = easeOut(ms / darts[0]);
        dog.x = button.x + (stops[0].x - button.x) * u;
        dog.y = button.y + (stops[0].y - button.y) * u;
        return dog;
      }
      let k = 0;
      while (k + 1 < DARTS && ms >= darts[k + 1]) k++;
      if (k + 1 < DARTS) {
        const u = easeIn(clamp01((ms - darts[k]) / (darts[k + 1] - darts[k])));
        bend.y = herds[k].y + herds[k].ry * 2.5;
        bezier(stops[k], bend, stops[k + 1], u, dog);
        return dog;
      }
      const total = cover?.total() ?? fallback;
      const u = clamp01((ms - darts[DARTS - 1]) / (endAt - darts[DARTS - 1]));
      leg.x = total.x;
      leg.y = total.y;
      return alongRoute(drive, easeIn(u), dog);
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      // a spot in the herd, as a share of its radius each way
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random());
      const ux = Math.cos(a) * d;
      const uy = Math.sin(a) * d;
      const lands =
        SPILL_FLIGHT_MS + Math.random() * (spillMs - SPILL_FLIGHT_MS);
      const lag = Math.random() * LAG_MS;
      const leaves =
        driveAt + sweepMs * (1 - uy) * 0.5 * (0.8 + 0.2 * Math.random());
      const phase = Math.random() * 6;
      const at = { x: 0, y: 0 };
      let from: Point | null = null;
      const place = (ms: number, out: Point) => {
        const h = herdAt(Math.max(0, ms - lag));
        out.x = h.x + ux * h.rx + Math.sin(ms * 0.01 + phase) * MILL;
        out.y = h.y + uy * h.ry + Math.cos(ms * 0.013 + phase) * MILL * 0.5;
        return out;
      };
      const spot = place(lands, { x: 0, y: 0 });
      const peak = {
        x: (button.x + spot.x) / 2,
        y: Math.min(button.y, spot.y) - 120,
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < lands) {
          const u = (ms - lands) / SPILL_FLIGHT_MS + 1;
          if (u < 0) return { x: button.x, y: button.y, scale: 0 };
          bezier(button, peak, spot, u, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (ms < leaves) {
          place(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        from ??= { ...place(leaves, at) };
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          { x: from.x, y: total.y + height * 0.1 },
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const nipping = createBeats(
      darts,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, DARTS - 1);
        cover!.burst(stops[k], lerp(DART_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DART_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          nipping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            dogAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * DOG),
            clamp01(ms / driveAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
