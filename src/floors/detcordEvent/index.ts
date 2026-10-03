// the "Detcord" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a wisp shoots out of the clicked floor's button
// and lays a long snaking cord of light across the screen; a spark lights
// its far end and races back along it, ever faster, and the whole cord
// erupts behind it in a rolling wall of white blasts, each a bang, a jolt
// and a spray of coins; the spark reaches the start and it all goes up in a
// huge blast and shake. Pays floor income × floor number × REWARD
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
import { measure, pointAlong, sampleLine } from "../cashFlow";

const KEY = "detcord";
const REWARD = 4;
const BLASTS = 10;
// the cord shows as BEADS little wisps strung along it
const BEADS = 24;
const BEAD = 0.14;
const EDGE = 40;
// the cord snakes WAVE px up and down, WAVES times across the screen
const WAVE = 120;
const WAVES = 2.5;
const LAYER = 0.4;
const SPARK = 0.36;
const FUSE = 22;
const BLAST = 140;
const COINS = 8;
const COIN_REACH: [number, number] = [30, 110];
const BLAST_SHAKE: [number, number] = [0.3, 1.2];

export const forceDetcordEvent = registerWispEvent(
  KEY,
  "Detcord",
  () => CONFIG.detcordEvent.chance,
  (floor, context, area) => {
    const { layMs, burnMs, holdMs, mergeMs } = CONFIG.detcordEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const mid = (area.top + area.bottom) / 2 + 60;
    const ltr = button.x < (area.left + area.right) / 2;
    const start = ltr ? area.left + EDGE : area.right - EDGE;
    const end = ltr ? area.right - EDGE : area.left + EDGE;
    const cord = sampleLine(
      (u) => ({
        x: lerp([start, end], u),
        y: mid + Math.sin(u * WAVES * Math.PI * 2) * WAVE,
      }),
      100,
    );
    const along = measure(cord);
    const burnAt = layMs;
    const endAt = burnAt + burnMs;
    // the spark burns back from the far end, speeding up
    const burnShare = (ms: number) =>
      1 - easeIn(clamp01((ms - burnAt) / burnMs));
    const blasts = Array.from({ length: BLASTS }, (_, k) => {
      const share = 1 - (k + 0.5) / BLASTS;
      const spot = pointAlong(cord, along, share, { x: 0, y: 0 });
      return { spot, blows: burnAt + burnMs * Math.sqrt(1 - share) };
    });
    const beads = Array.from({ length: BEADS }, (_, k) => {
      const share = k / (BEADS - 1);
      const spot = pointAlong(cord, along, share, { x: 0, y: 0 });
      return {
        at: () => spot,
        laid: layMs * (0.15 + 0.85 * share),
        burnt: burnAt + burnMs * Math.sqrt(1 - share),
      };
    });
    const first = cord[0];
    const layAt: Point = { x: 0, y: 0 };
    const layer = (ms: number): Point | null => {
      if (ms > layMs) return null;
      if (ms < layMs * 0.15) {
        const u = easeOut(ms / (layMs * 0.15));
        layAt.x = lerp([button.x, first.x], u);
        layAt.y = lerp([button.y, first.y], u);
        return layAt;
      }
      return pointAlong(
        cord,
        along,
        (ms - layMs * 0.15) / (layMs * 0.85),
        layAt,
      );
    };
    const sparkAt: Point = { x: 0, y: 0 };
    const spark = (ms: number): Point | null =>
      ms < burnAt || ms > endAt
        ? null
        : pointAlong(cord, along, burnShare(ms), sparkAt);

    const blowing = createBeats(
      blasts,
      (b) => b.blows,
      (b, k) => {
        cover!.launchFrom(b.spot, ringTargets(b.spot, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / (BLASTS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(first),
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
          if (ms > endAt + 1_200) return;
          for (const b of beads)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BEAD,
              0.3,
              b.laid,
              b.burnt,
            );
          for (const b of blasts)
            drawDetonation(ctx, b.spot, ms - b.blows, BLAST, now);
          drawWispBetween(
            ctx,
            layer,
            ms,
            now,
            WISP_SIZE * LAYER,
            0.4,
            0,
            layMs,
          );
          const p = spark(ms);
          if (p)
            drawLitFuse(ctx, p, clamp01((ms - burnAt) / burnMs), FUSE, now);
          drawWispBetween(
            ctx,
            spark,
            ms,
            now,
            WISP_SIZE * SPARK,
            1,
            burnAt,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
