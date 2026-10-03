// the "Bomb Carousel" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a ring of lit bomb wisps bursts out of the
// clicked floor's button and whirls round it like a carousel, spinning
// faster and swinging wider as their fuses burn down; then they let go one
// after another round the ring, each flung out across the screen to go off
// in a white blast, a bang, a big jolt and a spray of coins, the blasts
// racing round in a circle; the button blows last in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { ringTargets } from "../../shared/coinTargets";
import { fireBullet } from "../../shared/bullets";

const KEY = "bombCarousel";
const REWARD = 4;
const BOMBS = 8;
const EDGE = 60;
// the ring swings out from RADIUS[0] to RADIUS[1], turning TURNS times
const RADIUS: [number, number] = [40, 120];
const TURNS = 2.5;
const BOMB = 0.38;
const FUSE = 16;
const BLAST = 160;
const COINS = 10;
const COIN_REACH: [number, number] = [30, 120];
const BLOW_SHAKE: [number, number] = [0.6, 1.3];

export const forceBombCarouselEvent = registerWispEvent(
  KEY,
  "Bomb Carousel",
  () => CONFIG.bombCarouselEvent.chance,
  (floor, context, area) => {
    const { spinMs, flingMs, releasesMs, holdMs, mergeMs } =
      CONFIG.bombCarouselEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: Math.min(area.right - 200, Math.max(area.left + 200, button.x)),
      y: Math.min(area.bottom - 200, Math.max(area.top + 260, button.y)),
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE + 100,
      bottom: area.bottom - EDGE,
    };
    const turnAt = (ms: number) =>
      TURNS * Math.PI * 2 * easeIn(clamp01(ms / spinMs)) +
      (ms > spinMs ? (ms - spinMs) * 0.02 : 0);
    const radiusAt = (ms: number) =>
      lerp(RADIUS, easeOut(clamp01(ms / spinMs)));
    let clock: number = spinMs;
    const bombs = Array.from({ length: BOMBS }, (_, i) => {
      const lets = clock;
      clock += releasesMs / BOMBS;
      const a = turnAt(lets) + (i / BOMBS) * Math.PI * 2;
      const r = radiusAt(lets);
      const from: Point = {
        x: hub.x + Math.cos(a) * r,
        y: hub.y + Math.sin(a) * r,
      };
      const edge = fireBullet(hub, a, 0, 1, box).to;
      const spot: Point = {
        x: lerp([hub.x, edge.x], 0.85),
        y: lerp([hub.y, edge.y], 0.85),
      };
      const at: Point = { x: 0, y: 0 };
      return {
        spot,
        lets,
        blows: lets + flingMs,
        at: (ms: number): Point => {
          if (ms < lets) {
            const b = turnAt(ms) + (i / BOMBS) * Math.PI * 2;
            const rr = radiusAt(ms);
            at.x = lerp(
              [button.x, hub.x + Math.cos(b) * rr],
              easeOut(clamp01(ms / 200)),
            );
            at.y = lerp(
              [button.y, hub.y + Math.sin(b) * rr],
              easeOut(clamp01(ms / 200)),
            );
            return at;
          }
          const u = easeOut(clamp01((ms - lets) / flingMs));
          at.x = lerp([from.x, spot.x], u);
          at.y = lerp([from.y, spot.y], u);
          return at;
        },
      };
    });
    const lastBlow = bombs[BOMBS - 1].blows;
    const endAt = lastBlow + 150;

    const blowing = createBeats(
      bombs,
      (b) => b.blows,
      (b, k) => {
        cover!.launchFrom(b.spot, ringTargets(b.spot, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(BLOW_SHAKE, k / (BOMBS - 1)));
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
          blowing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of bombs) {
            drawDetonation(ctx, b.spot, ms - b.blows, BLAST, now);
            if (ms >= b.blows) continue;
            drawLitFuse(ctx, b.at(ms), clamp01(ms / b.blows), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              0,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
