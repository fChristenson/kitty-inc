// the "Hedgehog" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a big wisp curls up out of the clicked floor's
// button and rolls across the screen in bounces; at the top of every bounce
// it bristles and fires a ring of bullet wisps every way at once, muzzle
// flashes all round it, a bang and a jolt, each ring denser than the last,
// the bullets bursting into coins where they hit the screen's edges; the
// last bounce fires a huge triple ring and a river of cash slams into the
// total in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  bulletRing,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "hedgehog";
const REWARD = 4;
const EDGE = 12;
const MARGIN = 120;
// the ground it bounces on, a share down the screen
const GROUND = 0.66;
const RINGS = [10, 14, 18, 22];
const TRIPLE = 26;
const TRIPLE_GAP_MS = 70;
const HIGH: [number, number] = [300, 200];
const SPEED = 1.9;
const FLASHES = 8;
const FLASH_REACH = 34;
const FLASH_MS = 110;
const MUZZLE = 52;
const BRISTLE_MS = 160;
const HEDGEHOG = 1;
const BULLET = WISP_SIZE * 0.26;
const EDGE_COINS = 4;
const COIN_REACH: [number, number] = [20, 70];
const RIVER_MS = 420;
const VOLLEY_SHAKE: [number, number] = [0.8, 1.4];
const BANG_GAP_MS = 60;

export const forceHedgehogEvent = registerWispEvent(
  KEY,
  "Hedgehog",
  () => CONFIG.hedgehogEvent.chance,
  (floor, context, area) => {
    const { bouncesMs, holdMs, mergeMs } = CONFIG.hedgehogEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const ground = area.top + (area.bottom - area.top) * GROUND;
    const mid = (area.left + area.right) / 2;
    const rightward = button.x < mid;
    const farX = rightward ? area.right - MARGIN : area.left + MARGIN;
    const n = RINGS.length;
    let clock = 0;
    let from: Point = button;
    const hops = RINGS.map((count, k) => {
      const u = k / (n - 1);
      const to: Point = {
        x: lerp([button.x, farX], (k + 1) / n),
        y: ground,
      };
      const leaves = clock;
      clock += lerp(bouncesMs, u);
      const lands = clock;
      const high = lerp(HIGH, u);
      const a = from;
      from = to;
      const peaks = (leaves + lands) / 2;
      const apex: Point = {
        x: (a.x + to.x) / 2,
        y: (a.y + to.y) / 2 - high,
      };
      const last = k === n - 1;
      const flashes = Array.from({ length: FLASHES }, (_, f) => {
        const angle = (f / FLASHES) * Math.PI * 2;
        return {
          angle,
          at: {
            x: apex.x + Math.cos(angle) * FLASH_REACH,
            y: apex.y + Math.sin(angle) * FLASH_REACH,
          },
        };
      });
      const bullets: Bullet[] = last
        ? [0, 1, 2].flatMap((r) =>
            bulletRing(
              apex,
              TRIPLE,
              peaks + r * TRIPLE_GAP_MS,
              SPEED * (1 + 0.15 * r),
              box,
              (r * Math.PI) / TRIPLE,
            ),
          )
        : bulletRing(apex, count, peaks, SPEED, box, k * 0.4);
      return {
        a,
        to,
        high,
        leaves,
        lands,
        peaks,
        apex,
        flashes,
        bullets,
        last,
      };
    });
    const bullets = hops.flatMap((h) => h.bullets);
    const volleys = hops.flatMap((h) =>
      h.last
        ? [0, 1, 2].map((r) => ({ hop: h, ms: h.peaks + r * TRIPLE_GAP_MS }))
        : [{ hop: h, ms: h.peaks }],
    );
    const rolled = hops[n - 1].lands;
    const lastHit = Math.max(...bullets.map((b) => b.hitAt));
    const endAt = Math.max(rolled, lastHit) + 60;
    const riverAt = endAt - RIVER_MS;
    const hedgehogAt: Point = { x: 0, y: 0 };
    const hedgehog = (ms: number): Point => {
      const t = Math.max(0, ms);
      let h = hops[0];
      for (const hop of hops) if (t >= hop.leaves) h = hop;
      const u = clamp01((t - h.leaves) / (h.lands - h.leaves));
      hedgehogAt.x = lerp([h.a.x, h.to.x], u);
      hedgehogAt.y = lerp([h.a.y, h.to.y], u) - 4 * h.high * u * (1 - u);
      return hedgehogAt;
    };
    const total = totalSpot(area);
    const rest = hops[n - 1].to;
    const river = sampleLine(
      (u) => ({
        x: lerp([rest.x, total.x], u),
        y: lerp([rest.y, total.y], Math.sqrt(u)),
      }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 640,
      width: 48,
      streamMs: RIVER_MS * 0.7,
      travelMs: RIVER_MS,
    };
    const durationMs = Math.max(
      pourDurationMs(riverAt, flight),
      endAt + holdMs + mergeMs,
    );
    let lastBang = -Infinity;
    let lastPop = -Infinity;

    const firing = createBeats(
      volleys,
      (v) => v.ms,
      (v, k) => {
        cover!.burst(v.hop.apex, 0.5);
        if (!cover!.isLive()) return;
        if (v.ms - lastBang >= BANG_GAP_MS) {
          lastBang = v.ms;
          playExplosion();
        }
        shakeScreen(lerp(VOLLEY_SHAKE, k / Math.max(1, volleys.length - 1)));
      },
    );
    const hitting = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.12);
        cover!.launchFrom(b.to, ringTargets(b.to, EDGE_COINS, COIN_REACH));
        if (!cover!.isLive() || b.hitAt - lastPop < BANG_GAP_MS) return;
        lastPop = b.hitAt;
        playBloop();
      },
    );
    const pouring = createBeats(
      [riverAt],
      (ms) => ms,
      () => pourLine(cover!, river, flight),
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
          firing.tick(ms, now);
          hitting.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const v of volleys) {
            const t = (ms - v.ms) / FLASH_MS;
            if (t <= 0 || t >= 1) continue;
            for (const f of v.hop.flashes)
              drawMuzzleFlash(ctx, f.at, f.angle, t, MUZZLE);
          }
          // it bristles, swelling, as it nears each peak
          let bristle = 0;
          for (const h of hops)
            bristle = Math.max(
              bristle,
              1 - Math.abs(ms - h.peaks) / BRISTLE_MS,
            );
          drawWispBetween(
            ctx,
            hedgehog,
            ms,
            now,
            WISP_SIZE * HEDGEHOG * (1 + 0.35 * bristle),
            0.4 + 0.6 * bristle,
            0,
            rolled,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
