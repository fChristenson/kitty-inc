// the "Etch" event (beam): it covers its crit, whose click freezes the screen
// while a blazing beam stabs down from above it and scrawls a big zigzag
// across it, the screen rumbling, every turn a flash and a jolt, leaving a
// glowing trail of cash burnt in behind its tip; the beam snaps off with a
// bang and the whole trail runs along itself like a lit fuse, streaming
// into the total-income readout, which goes off in a huge blast and shake as
// the last of it arrives. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { measure, pointAlong, sampleLine, totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "etch";
const REWARD = 4;
// the scrawl's corners, as shares of the screen across and down
const SCRAWL: Point[] = [
  { x: 0.12, y: 0.78 },
  { x: 0.3, y: 0.4 },
  { x: 0.46, y: 0.8 },
  { x: 0.6, y: 0.38 },
  { x: 0.78, y: 0.82 },
  { x: 0.88, y: 0.45 },
];
const STEPS = 30;
// the trail: COINS burnt in up to SPREAD px off the scrawl
const COINS = 1_100;
const SPREAD = 9;
const COIN = 0.8;
const POP_MS = 70;
// the beam, BEAM px across, from above the screen's top
const BEAM = 26;
const FLARE = 30;
const RUMBLE_MS = 70;
const RUMBLE = 0.9;
const TURN_BURST = 0.6;
const TURN_SHAKE: [number, number] = [0.9, 1.8];
const SNAP_SHAKE = 2;

export const forceEtchEvent = registerWispEvent(
  KEY,
  "Etch",
  () => CONFIG.etchEvent.chance,
  (floor, context, area) => {
    const { etchMs, pauseMs, runMs, holdMs, mergeMs } = CONFIG.etchEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const flip = Math.random() < 0.5;
    const corners = SCRAWL.map((p) => ({
      x: area.left + width * (flip ? 1 - p.x : p.x),
      y: area.top + height * p.y,
    }));
    const scrawl = sampleLine(
      (u) => alongRoute(corners, u, { x: 0, y: 0 }),
      STEPS * (corners.length - 1),
    );
    const along = measure(scrawl);
    // the trail runs on off the scrawl's end into the total
    const run = [...scrawl, fallback];
    const runAlong = measure(run);
    const share = along[along.length - 1] / runAlong[runAlong.length - 1];
    const runFrom = etchMs + pauseMs;
    const travelMs = runFrom + runMs;
    const sky = { x: (area.left + area.right) / 2, y: area.top - 40 };
    const turns = corners.slice(1, -1).map((at, k) => ({
      at,
      ms: (etchMs * along[STEPS * (k + 1)]) / along[along.length - 1],
    }));

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const s = Math.random();
      const shownAt = s * etchMs;
      const spot = pointAlong(scrawl, along, s, { x: 0, y: 0 });
      spot.x += (Math.random() - 0.5) * SPREAD * 2;
      spot.y += (Math.random() - 0.5) * SPREAD * 2;
      return (f) => {
        const ms = f * travelMs;
        if (ms < shownAt) return { x: spot.x, y: spot.y, scale: 0 };
        if (ms < runFrom)
          return {
            x: spot.x,
            y: spot.y,
            scale: COIN * Math.min(1, (ms - shownAt) / POP_MS),
          };
        run[run.length - 1] = cover?.total() ?? fallback;
        const p = pointAlong(
          run,
          runAlong,
          s * share + (ms - runFrom) / runMs,
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    let lastRumble = -Infinity;
    const turning = createBeats(
      turns,
      (t) => t.ms,
      (t, k) => {
        cover!.burst(t.at, TURN_BURST);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, k / Math.max(1, turns.length - 1)));
      },
    );
    const snap = createBeats(
      [etchMs],
      (ms) => ms,
      () => {
        cover!.burst(corners[corners.length - 1], 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SNAP_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const tip = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          snap.tick(ms, now);
          finale.tick(ms, now);
          if (ms < etchMs && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(RUMBLE);
          }
        },
        drawOver: (ctx, ms) => {
          if (ms >= etchMs) return;
          pointAlong(scrawl, along, clamp01(ms / etchMs), tip);
          drawBeam(ctx, sky, tip, BEAM * (0.85 + 0.15 * Math.random()));
          drawBeamFlare(ctx, tip, FLARE);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
