// the "Colliding Storms" event (lightning; cash): it covers its crit, whose
// click freezes the screen while two storm clouds, tight clusters of wisps
// crackling with lightning, roll in from the left and right edges, bolts
// lashing down from their bellies and spraying coins wherever they strike;
// as they close in, bolts start arcing between the two, faster and fatter,
// until they collide in the middle in one colossal bolt and a blinding
// strike, raining cash, and a river of it slams into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "collidingStorms";
const REWARD = 4;
const PUFFS = 4;
const PUFF = 0.42;
const CLOUD_R = 46;
const CLOUD_Y = 0.36;
const START_OUT = 80;
const EDGE = 40;
const LASHES = 6;
const LASH_DROP: [number, number] = [200, 360];
const LASH_MS = 120;
const LASH_COINS = 50;
const LASH_REACH: [number, number] = [40, 170];
const ARCS = 8;
const ARC_FROM = 0.4;
const ARC_MS = 110;
const RAIN_COINS = 360;
const RAIN_REACH: [number, number] = [80, 520];
const COLOSSAL_MS = 300;
const BANG_GAP_MS = 60;
const LASH_SHAKE: [number, number] = [0.4, 1];

export const forceCollidingStormsEvent = registerWispEvent(
  KEY,
  "Colliding Storms",
  () => CONFIG.collidingStormsEvent.chance,
  (floor, context, area) => {
    const { approachMs, riverMs, holdMs, mergeMs } =
      CONFIG.collidingStormsEvent;
    const total = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const cy = area.top + (area.bottom - area.top) * CLOUD_Y;
    const middle: Point = { x: cx, y: cy };
    const collideAt = approachMs;
    // each cloud's middle at ms, side -1 from the left, 1 from the right
    const cloudX = (side: number, ms: number) =>
      lerp(
        [side < 0 ? area.left - START_OUT : area.right + START_OUT, cx],
        clamp01(ms / collideAt),
      );
    const cloudY = (ms: number) => cy + Math.sin(ms * 0.008) * 8;
    const clouds = [-1, 1].map((side) => {
      const puffs = Array.from({ length: PUFFS }, (_, j) => {
        const at: Point = { x: 0, y: 0 };
        const phase = (j / PUFFS) * Math.PI * 2;
        return (ms: number): Point => {
          ms = Math.max(0, ms);
          const a = phase + ms * 0.007 * side;
          at.x = cloudX(side, ms) + Math.cos(a) * CLOUD_R;
          at.y = cloudY(ms) + Math.sin(a) * CLOUD_R * 0.55;
          return at;
        };
      });
      const inner = [
        createBolt({ x: 0, y: 0 }, { x: CLOUD_R * 2, y: 0 }, 1),
        createBolt({ x: 0, y: 0 }, { x: CLOUD_R, y: CLOUD_R }, 1),
      ];
      const lashes = Array.from({ length: LASHES }, (_, i) => {
        const ms =
          lerp([260, collideAt * 0.88], Math.sqrt(i / LASHES)) + side * 30;
        const x = Math.min(
          area.right - EDGE,
          Math.max(
            area.left + EDGE,
            cloudX(side, ms) + (Math.random() - 0.5) * 80,
          ),
        );
        const hit: Point = {
          x,
          y: cloudY(ms) + lerp(LASH_DROP, Math.random()),
        };
        return {
          ms,
          hit,
          bolt: createBolt(
            { x, y: cloudY(ms) + CLOUD_R * 0.5 },
            hit,
            2,
          ) as Bolt,
        };
      });
      return { side, puffs, inner, lashes };
    });
    const lashes = clouds.flatMap((c) => c.lashes);
    const arcs = Array.from({ length: ARCS }, (_, i) => ({
      ms: lerp([collideAt * ARC_FROM, collideAt - 40], Math.sqrt(i / ARCS)),
      bolt: createBolt({ x: cx - 200, y: cy }, { x: cx + 200, y: cy }, 2),
      scale: lerp([0.5, 1.4], i / (ARCS - 1)),
    }));
    const colossal = createBolt(
      { x: cx, y: area.top },
      { x: cx, y: area.bottom - 60 },
      6,
    );
    const river = sampleLine(
      (u) => ({ x: lerp([cx, total.x], u), y: lerp([cy, total.y], u * u) }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 520,
      width: 40,
      streamMs: riverMs * 0.6,
      travelMs: riverMs,
    };
    const endAt = collideAt + riverMs;
    const durationMs = Math.max(
      pourDurationMs(collideAt, flight),
      endAt + holdMs + mergeMs,
    );
    let lastBang = -Infinity;

    const lashing = createBeats(
      lashes,
      (l) => l.ms,
      (l, k) => {
        cover!.launchFrom(
          l.hit,
          sprayTargets(
            l.hit,
            LASH_COINS,
            LASH_REACH,
            -Math.PI / 2,
            Math.PI * 1.4,
          ),
        );
        cover!.burst(l.hit, 0.35);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LASH_SHAKE, k / lashes.length));
        if (l.ms - lastBang < BANG_GAP_MS) return;
        lastBang = l.ms;
        playBloop();
      },
    );
    const arcing = createBeats(
      arcs,
      (a) => a.ms,
      (a) => {
        if (cover?.isLive()) shakeScreen(0.3 + 0.4 * a.scale);
      },
    );
    const colliding = createBeats(
      [collideAt],
      (ms) => ms,
      () => {
        cover!.launchFrom(
          middle,
          clampTargetsY(
            ringTargets(middle, RAIN_COINS, RAIN_REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        pourLine(cover!, river, flight);
        cover!.burst(middle, 1.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.2);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          lashing.tick(ms, now);
          arcing.tick(ms, now);
          colliding.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > collideAt + COLOSSAL_MS) return;
          if (ms < collideAt) {
            for (const c of clouds) {
              const x = cloudX(c.side, ms);
              const y = cloudY(ms);
              for (const bolt of c.inner) {
                if (Math.random() < 0.4) continue;
                const a = Math.random() * Math.PI * 2;
                bolt.from.x = x + Math.cos(a) * CLOUD_R;
                bolt.from.y = y + Math.sin(a) * CLOUD_R * 0.5;
                bolt.to.x = x - Math.cos(a) * CLOUD_R;
                bolt.to.y = y - Math.sin(a) * CLOUD_R * 0.5;
                drawBolt(ctx, bolt, 0.8, 0.35);
              }
              for (const l of c.lashes) {
                const t = (ms - l.ms) / LASH_MS;
                if (t < 0 || t >= 1) continue;
                l.bolt.from.x = x;
                l.bolt.from.y = y + CLOUD_R * 0.5;
                drawBolt(ctx, l.bolt, 1 - t, 0.7);
                drawStrike(ctx, l.hit, 1 - t, 0.9, now);
              }
            }
            const lx = cloudX(-1, ms);
            const rx = cloudX(1, ms);
            const y = cloudY(ms);
            for (const a of arcs) {
              const t = (ms - a.ms) / ARC_MS;
              if (t < 0 || t >= 1) continue;
              a.bolt.from.x = lx + CLOUD_R;
              a.bolt.from.y = y;
              a.bolt.to.x = rx - CLOUD_R;
              a.bolt.to.y = y;
              drawBolt(ctx, a.bolt, 1 - t, a.scale);
            }
          } else {
            const t = (ms - collideAt) / COLOSSAL_MS;
            drawBolt(ctx, colossal, 1 - t, 3);
            drawStrike(ctx, middle, 1 - t, 4.5, now);
          }
          for (const c of clouds)
            for (const puff of c.puffs)
              drawWispBetween(
                ctx,
                puff,
                ms,
                now,
                WISP_SIZE * PUFF,
                0.6,
                0,
                collideAt,
              );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
