// the "Zipper" event: it covers its crit, whose click freezes the screen while
// the wisp stitches down it in a tight zigzag from edge to edge like the
// teeth of a zipper, ever faster, every turn a flash, a click, a jolt and a
// coin; at the bottom it rips straight back up the middle, unzipping it, every
// stitch it passes bursting open in a flash and a spray of coins, and slams
// into the total-income readout in a huge blast and shake, and the coins
// sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import { CONFIG } from "../../../../config";
import { playBloop, playExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { sprayTargets } from "../../../../shared/coinTargets";
import { createBeats, type Beats } from "../../../../shared/eventBeats";

const KEY = "zipper";
const REWARD = 4;
// stitches from the top to the bottom, MARGIN of the screen's width in from
// its sides and its top and bottom
const STITCHES = 10;
const MARGIN = 0.12;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.05;
const GROW = 0.3;
// each turn: a burst, a click, a jolt and a coin tossed off the edge
const TURN_BURST: [number, number] = [0.15, 0.35];
const TURN_SHAKE: [number, number] = [0.3, 0.9];
const TOSS: [number, number] = [30, 90];
// each stitch bursting open: a flash, a bang and coins sprayed sideways
const OPEN_BURST = 0.45;
const OPEN_SHAKE = 1;
const OPEN_COINS = 3;
const OPEN_SPRAY: [number, number] = [60, 200];

export const forceZipperEvent = registerWispEvent(
  KEY,
  "Zipper",
  () => CONFIG.zipperEvent.chance,
  (floor, context, area) => {
    const { stitchMs, unzipMs, holdMs, mergeMs } = CONFIG.zipperEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const margin = width * MARGIN;
    const left = area.left + margin;
    const right = area.right - margin;
    const middle = (area.left + area.right) / 2;
    const top = area.top + height * MARGIN;
    const bottom = area.bottom - height * MARGIN;
    const fromLeft = Math.random() < 0.5;

    // the turns, edge to edge down the screen, the first off its top corner
    const turns: Point[] = Array.from({ length: STITCHES + 1 }, (_, k) => ({
      x: (k % 2 === 0) === fromLeft ? left : right,
      y: top + ((bottom - top) * k) / STITCHES,
    }));
    const start = { x: turns[0].x, y: area.top - size * 2 };
    const turnAt: number[] = [];
    let at = 0;
    for (let k = 0; k <= STITCHES; k++) {
      at += lerp(stitchMs, k / STITCHES);
      turnAt.push(at);
    }
    const unzipFrom = at;
    const blastAt = unzipFrom + unzipMs;
    // the stitches' crossings of the middle, popped as it rips past them
    const crossings = turns.slice(1).map((p, k) => ({
      x: middle,
      y: (p.y + turns[k].y) / 2,
    }));

    const point = { x: 0, y: 0 };
    const along = (a: Point, b: Point, u: number): Point => {
      point.x = a.x + (b.x - a.x) * u;
      point.y = a.y + (b.y - a.y) * u;
      return point;
    };
    const bottomMiddle = { x: middle, y: turns[STITCHES].y };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      let from = start;
      let fromMs = 0;
      for (let k = 0; k <= STITCHES; k++) {
        if (ms < turnAt[k])
          return along(from, turns[k], (ms - fromMs) / (turnAt[k] - fromMs));
        from = turns[k];
        fromMs = turnAt[k];
      }
      const total = cover?.total();
      if (!total) return null;
      // back to the middle, then straight up it into the total
      const u = ((ms - unzipFrom) / unzipMs) ** 1.4;
      if (u < 0.1) return along(turns[STITCHES], bottomMiddle, u / 0.1);
      return along(bottomMiddle, total, (u - 0.1) / 0.9);
    };
    // when it rips past height y on its way up
    const unzippedAt = (y: number) => {
      const total = cover?.total();
      if (!total) return blastAt;
      const share = (bottomMiddle.y - y) / (bottomMiddle.y - total.y);
      return unzipFrom + unzipMs * (0.1 + 0.9 * clamp01(share)) ** (1 / 1.4);
    };

    const turnBeats = createBeats(
      turns,
      (_, k) => turnAt[k],
      (p, k) => turned(p, k),
    );
    let openBeats: Beats<Point> | null = null;
    const finale = createBeats(
      [unzipFrom, blastAt],
      (ms) => ms,
      (_, k) => (k === 0 ? cover!.isLive() && playSwoosh() : blast()),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          openBeats ??= cover?.total()
            ? createBeats(
                crossings,
                (p) => unzippedAt(p.y),
                (p) => opened(p),
              )
            : null;
          turnBeats.tick(ms, now);
          openBeats?.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            size * (1 + GROW * clamp01(ms / blastAt)),
            clamp01(ms / blastAt),
            0,
            blastAt,
          ),
      },
    );
    if (!cover) return;

    function turned(p: Point, k: number): void {
      const t = k / STITCHES;
      cover!.burst(p, lerp(TURN_BURST, t));
      const out = p.x === left ? -1 : 1;
      cover!.launchFrom(p, [
        { x: p.x + out * lerp(TOSS, Math.random()), y: p.y },
      ]);
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(TURN_SHAKE, t));
    }
    function opened(p: Point): void {
      cover!.burst(p, OPEN_BURST);
      cover!.launchFrom(
        p,
        sprayTargets(p, OPEN_COINS, OPEN_SPRAY, 0, Math.PI * 2),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(OPEN_SHAKE);
    }
    function blast(): void {
      const total = cover!.total();
      if (total) cover!.blast(total);
    }
  },
);
