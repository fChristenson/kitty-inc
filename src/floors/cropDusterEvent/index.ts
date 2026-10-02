// the "Crop Duster" event: it covers its crit, whose click freezes the screen
// while a wisp swoops across it low like a crop-duster, pass after pass,
// each lower than the last, every pass a swoosh and a jolt as it lays a
// curtain of cash that rains down behind it and heaps along the bottom; then
// it pulls up into the total-income readout in a huge blast and shake, and
// the whole heap of cash sweeps up after it into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "cropDuster";
const REWARD = 4;
// the passes, as shares of the screen's height down from its top, each
// starting and ending OFF of its width beyond its sides
const PASSES = [0.32, 0.46, 0.6];
const OFF = 0.12;
const DIP = 18;
// the cash: COINS_EACH per pass, spread SPREAD px as it drops, falling to
// GROUND of the screen's height up from its bottom, give or take PILE
const COINS_EACH = 420;
const SPREAD = 14;
const GROUND = 0.07;
const PILE = 0.05;
const DRIFT = 0.25;
const COIN = 0.85;
// the duster, as a share of the screen's width
const DUSTER = 0.065;
const PASS_SHAKE = 1.1;

export const forceCropDusterEvent = registerWispEvent(
  KEY,
  "Crop Duster",
  () => CONFIG.cropDusterEvent.chance,
  (floor, context, area) => {
    const { passMs, fallMs, climbMs, sweepMs, flightMs, holdMs, mergeMs } =
      CONFIG.cropDusterEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const way = Math.random() < 0.5 ? 1 : -1;
    const sides = [area.left - width * OFF, area.right + width * OFF];
    const ground = area.bottom - height * GROUND;
    const climbFrom = PASSES.length * passMs;
    const blastAt = climbFrom + climbMs;
    const travelMs = blastAt + sweepMs + flightMs;
    const speed = (sides[1] - sides[0]) / passMs;
    // pass p runs one way, the next back the other
    const dir = (p: number) => (p % 2 === 0 ? way : -way);
    const duster = (ms: number, into: Point): Point => {
      if (ms < climbFrom) {
        const p = Math.floor(ms / passMs);
        const u = (ms - p * passMs) / passMs;
        const from = dir(p) === 1 ? sides[0] : sides[1];
        into.x = from + dir(p) * (sides[1] - sides[0]) * u;
        into.y = area.top + height * PASSES[p] + DIP * Math.sin(Math.PI * u);
        return into;
      }
      // in from the side once more, pulling up into the total
      const total = cover?.total() ?? fallback;
      const p = PASSES.length;
      const from = {
        x: dir(p) === 1 ? sides[0] : sides[1],
        y: area.top + height * PASSES[p - 1],
      };
      const bend = { x: total.x, y: from.y };
      return bezier(
        from,
        bend,
        total,
        clamp01((ms - climbFrom) / climbMs),
        into,
      );
    };
    const wisp = { x: 0, y: 0 };
    const dusterAt = (ms: number): Point | null =>
      ms < 0 || ms >= blastAt ? null : duster(ms, wisp);

    const paths: CoinPath[] = [];
    PASSES.forEach((_, p) => {
      // released only while the duster's over the screen
      const onFrom = (OFF / (1 + 2 * OFF)) * passMs;
      for (let n = 0; n < COINS_EACH; n++) {
        const release =
          p * passMs + onFrom + Math.random() * (passMs - 2 * onFrom);
        const drop = duster(release, { x: 0, y: 0 });
        drop.x += (Math.random() - 0.5) * SPREAD * 2;
        drop.y += (Math.random() - 0.5) * SPREAD;
        const drift = dir(p) * speed * DRIFT;
        const land = {
          x: Math.min(area.right, Math.max(area.left, drop.x + drift * fallMs)),
          y: ground - Math.random() * height * PILE,
        };
        const leave = blastAt + Math.random() * sweepMs;
        paths.push((f) => {
          const ms = f * travelMs;
          if (ms < release) return { x: drop.x, y: drop.y, scale: 0 };
          if (ms < release + fallMs) {
            const u = (ms - release) / fallMs;
            return {
              x: drop.x + (land.x - drop.x) * u,
              y: drop.y + (land.y - drop.y) * u * u,
              scale: COIN,
            };
          }
          if (ms < leave) return { x: land.x, y: land.y, scale: COIN };
          const total = cover?.total() ?? fallback;
          const q = bezier(
            land,
            { x: land.x, y: total.y },
            total,
            easeIn(clamp01((ms - leave) / flightMs)),
            {
              x: 0,
              y: 0,
            },
          );
          return { x: q.x, y: q.y, scale: COIN };
        });
      }
    });

    const passing = createBeats(
      PASSES,
      (_, p) => p * passMs,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(PASS_SHAKE);
      },
    );
    const finale = createBeats(
      [blastAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            dusterAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * DUSTER),
            0.7,
            0,
            blastAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
