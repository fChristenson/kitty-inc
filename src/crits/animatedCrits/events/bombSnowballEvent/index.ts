// the "Bomb Snowball" event (explosion; free hires): it covers its crit,
// whose click freezes the screen while a lit bomb wisp drops out of the
// clicked floor's button and rolls zigzagging down the screen, scooping up
// the fizzing bombs in its path one by one into a growing snowball of
// bombs, every pickup a pop and a jolt; at the bottom the snowball shudders
// and blows in a huge blast and shake, flinging its bombs out in a cluster
// onto the empty spots, where they go off one after another in a rolling
// chain, each a big blast, a bang and a shake as a new worker forms in it;
// the last a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "bombSnowball";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const EDGE = 160;
const BOTTOM = 220;
const PACK = 20;
const SPIN = 2.2;
const ARC = 200;
const CORE_BLAST = 300;
const BLAST = 170;
const CLUSTER = 3;
const CLUSTER_REACH = 70;
const CLUSTER_SIZE = 100;
const BOMB = 0.42;
const FUSE = 22;
const PICK_SHAKE = 0.5;
const CORE_SHAKE = 2.2;
const CHAIN_SHAKE: [number, number] = [0.9, 1.6];

export const forceBombSnowballEvent = registerWispEvent(
  KEY,
  "Bomb Snowball",
  () => CONFIG.bombSnowballEvent.chance,
  (floor, context, area) => {
    const { rollMs, shudderMs, flyMs, staggerMs, holdMs, mergeMs } =
      CONFIG.bombSnowballEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const n = hires.length;
    const end: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    // the zigzag down, a stray bomb waiting at every turn
    const route: Point[] = [button];
    for (let i = 1; i < n; i++) {
      const side = i % 2 === 1 ? -1 : 1;
      route.push({
        x: side < 0 ? area.left + EDGE : area.right - EDGE,
        y: lerp([button.y, end.y], i / n),
      });
    }
    route.push(end);
    const pickups = route.slice(1, n).map((at, i) => ({
      at,
      ms: (rollMs * (i + 1)) / n,
    }));
    const blowsAt = rollMs + shudderMs;
    const flights = hires.map((hire: RewardHire, i) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const flies = blowsAt;
      const lands = flies + flyMs + i * staggerMs;
      return { hire, spot, flies, lands, i };
    });
    const last = flights[flights.length - 1];
    const endAt = last.lands;
    const center: Point = { x: 0, y: 0 };
    const centerAt = (ms: number): Point => {
      alongRoute(route, clamp01(ms / rollMs), center);
      if (ms > rollMs && ms < blowsAt) {
        const s = (ms - rollMs) / shudderMs;
        center.x += Math.sin(ms * 0.9) * 8 * s;
        center.y += Math.cos(ms * 1.3) * 6 * s;
      }
      return center;
    };
    // how many bombs the snowball holds at ms
    const held = (ms: number) => {
      let count = 1;
      for (const p of pickups) if (ms >= p.ms) count++;
      return count;
    };
    const bombs = flights.map((f) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms >= f.lands) return null;
        if (ms >= f.flies) {
          const u = easeOut(clamp01((ms - f.flies) / (f.lands - f.flies)));
          const from = centerAt(blowsAt);
          at.x = lerp([from.x, f.spot.x], u);
          at.y = lerp([from.y, f.spot.y], u) - Math.sin(Math.PI * u) * ARC;
          return at;
        }
        // waiting at its pickup until the snowball rolls through it
        const pickup = f.i === 0 ? null : pickups[f.i - 1];
        if (pickup && ms < pickup.ms) {
          at.x = pickup.at.x;
          at.y = pickup.at.y;
          return at;
        }
        const c = centerAt(Math.max(0, ms));
        const count = held(ms);
        const a =
          (f.i / count) * Math.PI * 2 + (ms / 1000) * SPIN * Math.PI * 2;
        const r = f.i === 0 && count === 1 ? 0 : PACK * Math.sqrt(count);
        at.x = c.x + Math.cos(a) * r;
        at.y = c.y + Math.sin(a) * r;
        return at;
      };
    });
    const blasts = [
      { at: { ...centerAt(blowsAt) }, ms: blowsAt, size: CORE_BLAST },
      ...flights.flatMap((f) => [
        { at: f.spot, ms: f.lands, size: BLAST },
        ...Array.from({ length: CLUSTER }, (_, c) => {
          const a = (c / CLUSTER) * Math.PI * 2 + f.i;
          return {
            at: {
              x: f.spot.x + Math.cos(a) * CLUSTER_REACH,
              y: f.spot.y + Math.sin(a) * CLUSTER_REACH,
            },
            ms: f.lands + 50 + c * 30,
            size: CLUSTER_SIZE,
          };
        }),
      ]),
    ];

    const picking = createBeats(
      pickups,
      (p) => p.ms,
      (p) => {
        cover!.burst(p.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PICK_SHAKE);
      },
    );
    const blowing = createBeats(
      [blowsAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CORE_SHAKE);
      },
    );
    const landing = createBeats(
      flights,
      (f) => f.lands,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CHAIN_SHAKE, k / Math.max(1, flights.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          picking.tick(ms, now);
          blowing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (let i = 0; i < bombs.length; i++) {
            const at = bombs[i](ms);
            if (!at) continue;
            const f = flights[i];
            drawLitFuse(ctx, at, clamp01(ms / f.lands), FUSE, now);
            drawWispHead(ctx, bombs[i], ms, now, WISP_SIZE * BOMB);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
