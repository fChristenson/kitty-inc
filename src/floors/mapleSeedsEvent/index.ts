// the "Maple Seeds" event (wisp; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button flings a handful of
// seed wisps high into the air, and they come spinning back down like maple
// seeds, twirling in tight spirals as they drift all over the screen; each
// lands with a pop, a bloop, a jolt and a burst of coins, the landings
// pattering ever faster, the last a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "mapleSeeds";
const REWARD = 4;
const SEEDS = 10;
const EDGE = 60;
const TOP = 170;
// each seed twirls SPIN px round, TWIRLS times on its way down
const SPIN = 40;
const TWIRLS = 5;
const SEED = 0.35;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 120];
const LAND_SHAKE: [number, number] = [0.3, 1.1];

export const forceMapleSeedsEvent = registerWispEvent(
  KEY,
  "Maple Seeds",
  () => CONFIG.mapleSeedsEvent.chance,
  (floor, context, area) => {
    const { flingMs, fallMs, holdMs, mergeMs } = CONFIG.mapleSeedsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left - EDGE * 2;
    const height = area.bottom - area.top;
    const seeds = Array.from({ length: SEEDS }, (_, k) => {
      const high: Point = {
        x: area.left + EDGE + Math.random() * width,
        y: area.top + TOP + Math.random() * 80,
      };
      const land: Point = {
        x: Math.min(
          area.right - EDGE,
          Math.max(area.left + EDGE, high.x + (Math.random() - 0.5) * 160),
        ),
        y: area.top + height * (0.45 + 0.45 * Math.random()),
      };
      // later seeds fall quicker, so the landings bunch up
      const fall = fallMs * lerp([1, 0.55], k / (SEEDS - 1));
      const lands = flingMs + fall + k * 40;
      const phase = Math.random() * Math.PI * 2;
      const spin = Math.random() < 0.5 ? 1 : -1;
      const at: Point = { x: 0, y: 0 };
      return {
        land,
        lands,
        at: (ms: number): Point => {
          if (ms < flingMs) {
            const u = easeOut(ms / flingMs);
            at.x = lerp([button.x, high.x], u);
            at.y = lerp([button.y, high.y], u);
            return at;
          }
          const u = clamp01((ms - flingMs) / (lands - flingMs));
          const a = phase + spin * u * TWIRLS * Math.PI * 2;
          const r = SPIN * (1 - u * 0.7);
          at.x = lerp([high.x, land.x], u) + Math.cos(a) * r;
          at.y = lerp([high.y, land.y], u) + Math.sin(a) * r * 0.4;
          return at;
        },
      };
    }).sort((a, b) => a.lands - b.lands);
    const last = seeds[SEEDS - 1];
    const endAt = last.lands;

    const landing = createBeats(
      seeds,
      (s) => s.lands,
      (s, k) => {
        if (s === last) {
          cover!.blast(s.land);
          return;
        }
        cover!.launchFrom(s.land, ringTargets(s.land, COINS, COIN_REACH));
        cover!.burst(s.land, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / (SEEDS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const s of seeds)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SEED,
              0.5,
              0,
              s.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
