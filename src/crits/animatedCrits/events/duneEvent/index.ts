// the "Dune" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a great dune of cash heaps up
// at the bottom of the screen and starts to crawl, its cash streaming up
// the long back slope and tumbling down the steep slip face in avalanche
// after avalanche, each a jolt, crawling faster and faster across the
// screen; then a gust tears its crest off in a streaming plume of cash
// that blows up onto every income bar with a jolt of free levels, the last
// in a huge blast and shake. Pays floor income × floor number × REWARD,
// plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "dune";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 640;
const COIN = 0.45;
const LOW = 40;
const HEIGHT = 210;
// the dune's back slope as a share of the screen, and its slip face of that
const BACK = 0.3;
const FACE = 0.3;
// laps a second each grain climbs the back slope and tumbles down the face
const LAPS: [number, number] = [0.6, 2.2];
const GROW_MS = 250;
const PLUME_MS = 450;
const FLY_MS = 520;
const AVALANCHES = 5;
const SLIDE_SHAKE: [number, number] = [0.25, 0.7];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceDuneEvent = registerWispEvent(
  KEY,
  "Dune",
  () => CONFIG.duneEvent.chance,
  (floor, context, area) => {
    const { crawlMs, levelShare, holdMs, mergeMs } = CONFIG.duneEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const ground = area.bottom - LOW;
    const back = width * BACK;
    const face = back * FACE;
    const from = area.left + back * 0.9;
    const to = area.right - face - 20;
    const crestAt = (ms: number) =>
      lerp([from, to], clamp01(ms / crawlMs) ** 1.5);
    // the dune's surface height s along it: -1 at the back's foot, 0 at the
    // crest, FACE at the slip face's foot
    const heightAt = (s: number) =>
      s <= 0 ? HEIGHT * (1 + s) ** 1.3 : HEIGHT * (1 - s / FACE) ** 1.6;
    const seconds = crawlMs / 1000;
    const lapsBy = (ms: number) => {
      const s = Math.min(Math.max(0, ms), crawlMs + 1000) / 1000;
      return LAPS[0] * s + ((LAPS[1] - LAPS[0]) * s * s) / (2 * seconds);
    };
    const plumes = crawlMs;
    const hits = bars.map((bar, k) => ({
      bar,
      ms: plumes + (k / bars.length) * PLUME_MS + FLY_MS,
    }));
    const last = hits[hits.length - 1];
    const travel = plumes + PLUME_MS + FLY_MS;
    const grainAt = (phase: number, depth: number, ms: number, into: Point) => {
      const crest = crestAt(ms);
      const u = (phase + lapsBy(ms) * (1 - 0.6 * depth)) % 1;
      // up the back slope, then tumbling down the face
      const s = u < 0.8 ? -1 + u / 0.8 : ((u - 0.8) / 0.2) * FACE;
      into.x = crest + s * back;
      into.y = lerp([ground - heightAt(s), ground], depth);
      return into;
    };
    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const phase = Math.random();
      const depth = Math.random() ** 1.5;
      const appears = Math.random() * GROW_MS;
      const k = i % bars.length;
      const hit = hits[k];
      const leaves = hit.ms - FLY_MS - (Math.random() * PLUME_MS) / bars.length;
      const target: Point = {
        x: hit.bar.box.x + Math.random() * hit.bar.box.width,
        y: hit.bar.box.y - 4 - Math.random() * 16,
      };
      const at: Point = { x: 0, y: 0 };
      const start: Point = { x: 0, y: 0 };
      const bend: Point = { x: 0, y: 0 };
      paths.push((f) => {
        const ms = f * travel;
        if (ms < leaves) {
          grainAt(phase, depth, ms, at);
          return {
            x: at.x,
            y: at.y,
            scale: COIN * easeOut(clamp01((ms - appears) / GROW_MS)),
          };
        }
        // torn off the crest and blown up onto its bar
        grainAt(phase, depth, leaves, start);
        bend.x = start.x + 160;
        bend.y = Math.min(start.y, target.y) - 180;
        const p = bezier(
          start,
          bend,
          target,
          easeIn(clamp01((ms - leaves) / FLY_MS)),
          at,
        );
        return { x: p.x, y: p.y, scale: COIN };
      });
    }

    const sliding = createBeats(
      Array.from(
        { length: AVALANCHES },
        (_, k) => crawlMs * ((k + 1) / (AVALANCHES + 1)) ** 0.8,
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SLIDE_SHAKE, k / (AVALANCHES - 1)));
      },
    );
    const gusting = createBeats(
      [plumes],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SLIDE_SHAKE[1]);
      },
    );
    const landing = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(
          h.bar,
          levelsFor(h.bar.floor, levelShare, 2),
          h.bar.center,
        );
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          sliding.tick(ms, now);
          gusting.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
