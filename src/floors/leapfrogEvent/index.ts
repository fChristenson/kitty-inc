// the "Leapfrog" event: it covers its crit, whose click freezes the screen
// while two wisps pop up on one side of it and leapfrog across it: the one
// behind vaults high over the other and slams down ahead of it, over and over,
// ever faster and higher, each landing a flash, a thud, a jolt and coins
// kicked on ahead; across the far side, both leap together straight up into
// the total-income readout and explode in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import { CONFIG } from "../../config";
import { playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "leapfrog";
const REWARD = 4;
// vaults across, over a row MARGIN of the screen's width in from its sides
// and DROP of its height below its middle; each HEIGHT of its height high
const VAULTS = 7;
const MARGIN = 0.12;
const DROP = 0.12;
const HEIGHT: [number, number] = [0.16, 0.28];
const POP_MS = 180;
// the wisps, as a share of the screen's width
const WISP = 0.06;
// each landing: a burst, a thud, a jolt and coins kicked on ahead
const LAND_BURST: [number, number] = [0.35, 0.6];
const LAND_SHAKE: [number, number] = [0.7, 1.6];
const LAND_COINS: [number, number] = [3, 5];
const KICK: [number, number] = [60, 200];
const KICK_SPAN = 1.3;

export const forceLeapfrogEvent = registerWispEvent(
  KEY,
  "Leapfrog",
  () => CONFIG.leapfrogEvent.chance,
  (floor, context, area) => {
    const { vaultMs, finalMs, holdMs, mergeMs } = CONFIG.leapfrogEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = (area.top + area.bottom) / 2 + height * DROP;
    const first = dir === 1 ? area.left + width * MARGIN : area.right - width * MARGIN;
    const step = (dir * (width * (1 - MARGIN * 2))) / (VAULTS + 1);
    const spots: Point[] = Array.from({ length: VAULTS + 2 }, (_, k) => ({
      x: first + step * k,
      y,
    }));
    // vault k lifts the wisp behind (k's parity) from spot k to spot k + 2
    const landAt: number[] = [];
    let at = POP_MS;
    for (let k = 0; k < VAULTS; k++) {
      at += lerp(vaultMs, k / (VAULTS - 1));
      landAt.push(at);
    }
    const leapFrom = at;
    const blastAt = leapFrom + finalMs;

    // where wisp w (0 or 1) is ms in: it makes every other vault
    const spotOf = (w: number, ms: number, into: Point): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      let rest = spots[w];
      for (let k = w; k < VAULTS; k += 2) {
        const start = k === 0 ? POP_MS : landAt[k - 1];
        if (ms < start) break;
        if (ms < landAt[k]) {
          const u = (ms - start) / (landAt[k] - start);
          const a = spots[k];
          const b = spots[k + 2];
          into.x = a.x + (b.x - a.x) * u;
          into.y = y - height * lerp(HEIGHT, k / (VAULTS - 1)) * 4 * u * (1 - u);
          return into;
        }
        rest = spots[k + 2];
      }
      const total = cover?.total();
      if (ms < leapFrom || !total) {
        into.x = rest.x;
        into.y = rest.y;
        return into;
      }
      // both leap together into the total
      const u = (ms - leapFrom) / finalMs;
      into.x = rest.x + (total.x - rest.x) * u;
      into.y = rest.y + (total.y - rest.y) * u - height * 0.2 * 4 * u * (1 - u);
      return into;
    };
    const paths = [0, 1].map((w) => {
      const point = { x: 0, y: 0 };
      return (ms: number) => spotOf(w, ms, point);
    });

    const beats = createBeats(
      [...landAt, leapFrom, blastAt],
      (ms) => ms,
      (_, k) =>
        k === VAULTS + 1
          ? blast()
          : k === VAULTS
            ? cover!.isLive() && playSwoosh()
            : landed(k),
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
          for (const path of paths)
            drawWispBetween(ctx, path, ms, now, size * pop, heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function landed(k: number): void {
      const spot = spots[k + 2];
      const t = k / (VAULTS - 1);
      cover!.burst(spot, lerp(LAND_BURST, t));
      cover!.launchFrom(
        spot,
        sprayTargets(
          spot,
          Math.round(lerp(LAND_COINS, t)),
          KICK,
          dir === 1 ? -Math.PI / 4 : (-3 * Math.PI) / 4,
          KICK_SPAN,
        ),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(lerp(LAND_SHAKE, t));
    }
    function blast(): void {
      const total = cover!.total();
      if (total) cover!.blast(total);
    }
  },
);
