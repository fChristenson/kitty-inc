// the "Spiral Charge" event (explosion; cash): it covers its crit, whose
// click freezes the screen while lit charges stream out of the clicked
// floor's button and lay themselves in a spiral round the middle of the
// screen; the centre charge goes off and the blasts chain outward round
// the spiral, bang after bang, shake after shake, coins spraying from
// every one, until the whole outer ring blows at once in a cluster round a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "spiralCharge";
const REWARD = 4;
// CHAIN charges along the spiral, then RING round its rim at once
const CHAIN = 6;
const RING = 4;
const TURNS = 1.25;
const REACH = 0.36;
const STAGGER_MS = 30;
const CHARGE = 0.34;
const FUSE = 13;
const CHAIN_BLAST: [number, number] = [140, 220];
const RING_BLAST = 200;
const FINALE_BLAST = 340;
const COINS = 16;
const COIN_REACH: [number, number] = [20, 110];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceSpiralChargeEvent = registerWispEvent(
  KEY,
  "Spiral Charge",
  () => CONFIG.spiralChargeEvent.chance,
  (floor, context, area) => {
    const { setupMs, chainMs, holdMs, mergeMs } = CONFIG.spiralChargeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const reach =
      Math.min(area.right - area.left, area.bottom - area.top) * REACH;
    const turn = Math.random() * Math.PI * 2;
    const spots: Point[] = Array.from({ length: CHAIN }, (_, i) => {
      const u = i / CHAIN;
      const a = turn + u * Math.PI * 2 * TURNS;
      return {
        x: hub.x + Math.cos(a) * reach * u,
        y: hub.y + Math.sin(a) * reach * u,
      };
    });
    const rim: Point[] = Array.from({ length: RING }, (_, i) => {
      const a = turn + Math.PI * 2 * TURNS + (i / RING) * Math.PI * 2;
      return { x: hub.x + Math.cos(a) * reach, y: hub.y + Math.sin(a) * reach };
    });
    const armed = setupMs + (CHAIN + RING) * STAGGER_MS;
    const blasts: Blast[] = [];
    const charges = [...spots, ...rim].map((spot, i) => {
      const ring = i >= CHAIN;
      const blows = ring ? armed + CHAIN * chainMs : armed + i * chainMs;
      blasts.push({
        at: spot,
        ms: blows,
        size: ring ? RING_BLAST : lerp(CHAIN_BLAST, i / (CHAIN - 1)),
        shake: ring ? 1.3 : 0.6 + 0.1 * i,
      });
      const delay = i * STAGGER_MS;
      const at: Point = { x: 0, y: 0 };
      return {
        blows,
        delay,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - delay) / setupMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      };
    });
    const endAt = armed + CHAIN * chainMs;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(b.at, ringTargets(b.at, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, hub, ms - endAt, FINALE_BLAST, now);
          for (const c of charges) {
            if (ms < c.delay || ms >= c.blows) continue;
            drawLitFuse(ctx, c.at(ms), ms / c.blows, FUSE, now);
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CHARGE,
              0.5,
              c.delay,
              c.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
