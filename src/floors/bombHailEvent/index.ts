// the "Bomb Hail" event (explosion; cash): it covers its crit, whose click
// freezes the screen while lit bomb wisps come hailing down at a slant from
// the top of the screen in ever bigger volleys, three, then four, five, six,
// each one landing in a big blast, a bang and a jolt and a spray of coins,
// the blasts rolling on one after another; the last volley of eight lands
// all at once in a cluster of huge blasts, and the total goes up in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "bombHail";
const REWARD = 4;
const VOLLEYS = [3, 4, 5, 6, 8];
const STAGGER_MS = 45;
const MARGIN = 110;
const TOP = 260;
const SLANT = 180;
const BLAST = 170;
const FINAL_BLAST = 260;
const COINS = 10;
const COIN_REACH: [number, number] = [40, 140];
const BOMB = 0.4;
const FUSE = 14;
const FINALE_DELAY_MS = 160;
const BANG_GAP_MS = 60;
const HAIL_SHAKE: [number, number] = [0.5, 1.2];

interface Bomb {
  from: Point;
  to: Point;
  drops: number;
  lands: number;
  size: number;
  shake: number;
  at: (ms: number) => Point;
}

export const forceBombHailEvent = registerWispEvent(
  KEY,
  "Bomb Hail",
  () => CONFIG.bombHailEvent.chance,
  (floor, context, area) => {
    const { hailMs, fallMs, holdMs, mergeMs } = CONFIG.bombHailEvent;
    const total = totalSpot(area);
    const bombs: Bomb[] = VOLLEYS.flatMap((count, v) => {
      const final = v === VOLLEYS.length - 1;
      const volleyAt = fallMs + (hailMs * v) / (VOLLEYS.length - 1);
      return Array.from({ length: count }, (_, i) => {
        const to: Point = {
          x: lerp(
            [area.left + MARGIN, area.right - MARGIN],
            final ? (i + 0.5) / count : Math.random(),
          ),
          y: lerp(
            [area.top + TOP, area.bottom - MARGIN],
            final ? 0.5 + 0.3 * Math.sin(i * 2.1) : Math.random(),
          ),
        };
        const from: Point = { x: to.x + SLANT, y: area.top - 60 };
        const lands = volleyAt + (final ? i * 12 : i * STAGGER_MS);
        const drops = lands - fallMs;
        const at: Point = { x: 0, y: 0 };
        return {
          from,
          to,
          drops,
          lands,
          size: final ? FINAL_BLAST : BLAST,
          shake: final ? 1.6 : lerp(HAIL_SHAKE, v / (VOLLEYS.length - 1)),
          at: (ms: number): Point => {
            const e = easeIn(clamp01((ms - drops) / (lands - drops)));
            at.x = lerp([from.x, to.x], e);
            at.y = lerp([from.y, to.y], e);
            return at;
          },
        };
      });
    });
    const lastLand = Math.max(...bombs.map((b) => b.lands));
    const endAt = lastLand + FINALE_DELAY_MS;
    let lastBang = -Infinity;

    const landing = createBeats(
      bombs,
      (b) => b.lands,
      (b) => {
        cover!.launchFrom(
          b.to,
          clampTargetsY(
            ringTargets(b.to, COINS, COIN_REACH),
            area.top + MARGIN,
            area.bottom - MARGIN / 2,
          ),
        );
        if (!cover!.isLive()) return;
        if (b.lands - lastBang >= BANG_GAP_MS) {
          lastBang = b.lands;
          playExplosion();
        }
        shakeScreen(b.shake);
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
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 900) return;
          for (const b of bombs) {
            drawDetonation(ctx, b.to, ms - b.lands, b.size, now);
            if (ms < b.drops || ms >= b.lands) continue;
            const at = b.at(ms);
            drawLitFuse(ctx, at, (ms - b.drops) / fallMs, FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              b.drops,
              b.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
