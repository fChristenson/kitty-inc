// the "Cast Net" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a fisher wisp at the bottom of
// the screen whirls a bundle of cash round itself and casts it; it flies up
// in an arc, spreading open into a wide round net of cash, and drops over a
// pair of workers, cinching tight on them in a flash, a bang and a jolt as
// they climb a perma tier; a fresh net pours into its hands for the next
// cast, quicker each time, the last in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "castNet";
const REWARD = 2;
const MAX_WORKERS = 6;
const GROUP = 2;
const BOTTOM = 140;
// the net's knots: rings of coins and spokes out to its rim
const RINGS = [0.25, 0.5, 0.75, 1];
const RING_COINS = 30;
const SPOKES = 10;
const SPOKE_COINS = 6;
const BUNDLE = 40;
const OPEN = 170;
const CINCH = 0.3;
const LIFT = 260;
const WHIRL = 0.02;
const COIN = 0.45;
const FISHER = 0.7;
const CAST_SHAKE: [number, number] = [0.7, 1.4];

interface Cast {
  workers: RewardWorker[];
  at: Point;
  reach: number;
  forms: number;
  thrown: number;
  lands: number;
}

export const forceCastNetEvent = registerWispEvent(
  KEY,
  "Cast Net",
  () => CONFIG.castNetEvent.chance,
  (floor, context, area) => {
    const { formMs, whirlsMs, flightMs, cinchMs, holdMs, mergeMs } =
      CONFIG.castNetEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fisher: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    let clock = 0;
    const casts: Cast[] = [];
    for (let i = 0; i < workers.length; i += GROUP) {
      const group = workers.slice(i, i + GROUP);
      const at: Point = {
        x: group.reduce((s, w) => s + w.at.x, 0) / group.length,
        y: group.reduce((s, w) => s + w.at.y, 0) / group.length,
      };
      const spread = Math.max(
        ...group.map((w) => Math.hypot(w.at.x - at.x, w.at.y - at.y)),
      );
      const k = casts.length;
      const forms = clock;
      const thrown =
        forms +
        formMs +
        lerp(whirlsMs, k / Math.max(1, Math.ceil(workers.length / GROUP) - 1));
      casts.push({
        workers: group,
        at,
        reach: Math.max(OPEN, spread + 80),
        forms,
        thrown,
        lands: thrown + flightMs,
      });
      clock = thrown;
    }
    const last = casts[casts.length - 1];
    const travel = last.lands + cinchMs + 60;
    // the knots of one net, as offsets on a unit disc
    const knots: Point[] = [
      ...RINGS.flatMap((r) =>
        Array.from({ length: RING_COINS }, (_, i) => {
          const a = (i / RING_COINS) * Math.PI * 2;
          return { x: Math.cos(a) * r, y: Math.sin(a) * r };
        }),
      ),
      ...Array.from({ length: SPOKES * SPOKE_COINS }, (_, i) => {
        const a = (Math.floor(i / SPOKE_COINS) / SPOKES) * Math.PI * 2;
        const r = ((i % SPOKE_COINS) + 0.5) / SPOKE_COINS;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      }),
    ];
    const paths: CoinPath[] = casts.flatMap((c) =>
      knots.map((knot) => (f: number) => {
        const ms = f * travel;
        if (ms < c.forms) return { x: button.x, y: button.y, scale: 0 };
        // whirled round the fisher in a tight bundle
        const spin = Math.max(0, Math.min(ms, c.thrown) - c.forms) * WHIRL;
        const cos = Math.cos(spin);
        const sin = Math.sin(spin);
        const kx = knot.x * cos - knot.y * sin;
        const ky = knot.x * sin + knot.y * cos;
        if (ms < c.forms + formMs) {
          const u = easeOut((ms - c.forms) / formMs);
          return {
            x: lerp([button.x, fisher.x + kx * BUNDLE], u),
            y: lerp([button.y, fisher.y + ky * BUNDLE], u),
            scale: COIN * u,
          };
        }
        if (ms < c.thrown)
          return {
            x: fisher.x + kx * BUNDLE,
            y: fisher.y + ky * BUNDLE,
            scale: COIN,
          };
        // flung up in an arc, opening wide, then cinching onto the workers
        const u = clamp01((ms - c.thrown) / (c.lands - c.thrown));
        const cinch = easeIn(clamp01((ms - c.lands) / cinchMs));
        const radius =
          lerp([BUNDLE, c.reach], easeOut(u)) * lerp([1, CINCH], cinch);
        const cx = lerp([fisher.x, c.at.x], u);
        const cy = lerp([fisher.y, c.at.y], u) - 4 * LIFT * u * (1 - u);
        return { x: cx + kx * radius, y: cy + ky * radius * 0.85, scale: COIN };
      }),
    );
    const sway: Point = { x: 0, y: fisher.y };
    const fisherAt = (ms: number): Point => {
      sway.x = fisher.x + Math.sin(ms * 0.02) * 6;
      return sway;
    };

    const throwing = createBeats(
      casts,
      (c) => c.thrown,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const cinching = createBeats(
      casts,
      (c) => c.lands + cinchMs,
      (c, k) => {
        for (const w of c.workers) cover!.promote(w);
        if (c === last) {
          cover!.blast(c.at);
          return;
        }
        cover!.burst(c.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CAST_SHAKE, k / Math.max(1, casts.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          throwing.tick(ms, now);
          cinching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            fisherAt,
            ms,
            now,
            WISP_SIZE * FISHER,
            0.7,
            0,
            last.thrown + 200,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
