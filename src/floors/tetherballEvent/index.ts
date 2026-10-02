// the "Tetherball" event (mix; free upgrade levels, a crit tier and cash):
// it covers its crit, whose click freezes the screen while a wisp flies off
// the clicked floor's income bar on a rope of flowing cash and whirls round
// it like a tetherball, the rope winding shorter and the wisp whipping
// faster every lap, each lap a whoosh, a bang and a jolt that lands free
// levels on the bar; wound all the way in, the wisp slams into the bar,
// which jumps a crit tier in a huge blast of cash and shake. Pays floor
// income × floor number × REWARD, plus the levels and tier
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "tetherball";
const REWARD = 2;
const LAPS = 4;
const ROPE_COINS = 420;
const SPREAD = 10;
const COIN = 0.7;
// the rope's far end trails the wisp by up to LAG ms, so it curls
const LAG = 90;
const LAP_SHAKE: [number, number] = [0.6, 1.4];

export const forceTetherballEvent = registerWispEvent(
  KEY,
  "Tetherball",
  () => CONFIG.tetherballEvent.chance,
  (floor, context, area) => {
    const { launchMs, spinMs, levelShare, holdMs, mergeMs } =
      CONFIG.tetherballEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const pole = own.center;
    const reach = Math.max(
      120,
      Math.min(
        320,
        pole.x - area.left - 40,
        area.right - pole.x - 40,
        pole.y - area.top - 40,
        area.bottom - pole.y - 40,
      ),
    );
    const dir = Math.random() < 0.5 ? 1 : -1;
    const start = -Math.PI / 2;
    const endAt = launchMs + spinMs;
    // the angle sweeps with u², so each lap comes quicker
    const ball = (ms: number, into: Point): Point => {
      const t = Math.max(0, ms);
      const u = clamp01((t - launchMs) / spinMs);
      const r = reach * clamp01(t / launchMs) * Math.sqrt(1 - u);
      const a = start + dir * Math.PI * 2 * LAPS * u * u;
      into.x = pole.x + Math.cos(a) * r;
      into.y = pole.y + Math.sin(a) * r;
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null =>
      ms < 0 || ms > endAt ? null : ball(ms, head);
    const paths: CoinPath[] = Array.from({ length: ROPE_COINS }, (_, i) => {
      const s = (i + 1) / ROPE_COINS;
      const dx = (Math.random() * 2 - 1) * SPREAD * s;
      const dy = (Math.random() * 2 - 1) * SPREAD * s;
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms >= endAt) return { x: pole.x, y: pole.y, scale: 0 };
        ball(ms - LAG * s, at);
        return {
          x: pole.x + (at.x - pole.x) * s + dx,
          y: pole.y + (at.y - pole.y) * s + dy,
          scale: COIN,
        };
      };
    });
    const laps = Array.from(
      { length: LAPS - 1 },
      (_, k) => launchMs + spinMs * Math.sqrt((k + 1) / LAPS),
    );

    const lapping = createBeats(
      laps,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, laps.length - 1);
        const at = ball(ms, { x: 0, y: 0 });
        cover!.levels(own, levelsFor(own.floor, levelShare, 2), at);
        cover!.burst(at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playSwoosh();
        playExplosion();
        shakeScreen(lerp(LAP_SHAKE, t));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3));
        cover!.tierUp(own);
        cover!.slam(own);
        cover!.blast(pole);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [own],
        tick: (ms, now) => {
          lapping.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
