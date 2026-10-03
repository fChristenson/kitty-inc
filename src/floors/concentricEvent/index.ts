// the "Concentric" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a lit bomb wisp drops out of the clicked floor's
// button to the middle of the screen, ringed by ever wider rings of bombs;
// the middle one goes off in a big white blast that sets the first ring
// blowing round in a chain, which sets off the next ring racing round
// faster, every blast a bang, a spray of coins and its own shake; then the
// whole outer ring goes up at once in a cluster round one huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "concentric";
const REWARD = 4;
// rings of COUNTS bombs at RADII px; the last ring blows all at once
const COUNTS = [5, 8, 10];
const RADII = [110, 200, 285];
const SQUASH = 0.8;
const DROP_MS = 300;
const BOMB = 0.3;
const FUSE = 13;
const CORE_BLAST = 220;
const BLAST = 140;
const HUGE = 320;
const COINS = 6;
const COIN_REACH: [number, number] = [25, 100];
const BANG_GAP_MS = 60;
const CORE_SHAKE = 1.2;
const RING_SHAKE: [number, number] = [0.5, 1];

interface Bomb {
  at: (ms: number) => Point;
  spot: Point;
  shows: number;
  blows: number;
  size: number;
  shake: number;
}

export const forceConcentricEvent = registerWispEvent(
  KEY,
  "Concentric",
  () => CONFIG.concentricEvent.chance,
  (floor, context, area) => {
    const { ringsMs, holdMs, mergeMs } = CONFIG.concentricEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const fixed = (spot: Point) => () => spot;
    const coreAt: Point = { x: 0, y: 0 };
    const bombs: Bomb[] = [
      {
        spot: center,
        shows: 0,
        blows: DROP_MS,
        size: CORE_BLAST,
        shake: CORE_SHAKE,
        at: (ms: number): Point => {
          const u = easeOut(clamp01(ms / (DROP_MS * 0.6)));
          coreAt.x = lerp([button.x, center.x], u);
          coreAt.y = lerp([button.y, center.y], u);
          return coreAt;
        },
      },
    ];
    let clock: number = DROP_MS;
    let shows = 0;
    COUNTS.forEach((count, r) => {
      const outer = r === COUNTS.length - 1;
      const span = lerp(ringsMs, r / (COUNTS.length - 1));
      const turn = r * 0.4;
      for (let i = 0; i < count; i++) {
        const a = turn + (i / count) * Math.PI * 2;
        const spot: Point = {
          x: center.x + Math.cos(a) * RADII[r],
          y: center.y + Math.sin(a) * RADII[r] * SQUASH,
        };
        bombs.push({
          spot,
          shows,
          blows: outer ? clock + span : clock + (span * (i + 1)) / count,
          size: outer ? BLAST * 1.2 : BLAST,
          shake: outer ? 0 : lerp(RING_SHAKE, r / (COUNTS.length - 1)),
          at: fixed(spot),
        });
      }
      // each ring shows as the one inside it starts going off
      shows = clock;
      clock += span;
    });
    const endAt = clock;
    let lastBang = -Infinity;

    const booming = createBeats(
      bombs,
      (b) => b.blows,
      (b) => {
        cover!.launchFrom(b.spot, ringTargets(b.spot, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (b.blows - lastBang >= BANG_GAP_MS) {
          lastBang = b.blows;
          playExplosion();
        }
        if (b.shake > 0) shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
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
          for (const b of bombs)
            drawDetonation(ctx, b.spot, ms - b.blows, b.size, now);
          drawDetonation(ctx, center, ms - endAt, HUGE, now);
          for (const b of bombs) {
            if (ms < b.shows || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              clamp01((ms - b.shows) / (b.blows - b.shows)),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              b.shows,
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
