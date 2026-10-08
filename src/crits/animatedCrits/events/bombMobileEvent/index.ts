// the "Bomb Mobile" event (explosion; a crit tier): it covers its crit, whose
// click freezes the screen while a mobile of lit bombs drops down on glitter
// strings over the clicked floor's bar, like a baby's mobile: a giant bomb
// hanging from the top hub, two big ones at the ends of its arm and four
// more on the arms hanging under them, every arm turning, ever faster, fuses
// blinking quicker; the four tips blow one after another in big blasts, each
// bursting into a cluster, then the two big ones go up harder; the strings
// burn through and the giant drops onto the bar in a colossal blast ringed
// by more, and the bar jumps a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";

const KEY = "bombMobile";
// the strings' lengths top down, the arms' half-widths, the tiers' turning
// (laps a second, ramping) and their bombs' sizes
const STRINGS = [130, 110, 100];
const ARMS = [230, 110];
const TURN_HZ: [number, number][] = [
  [0.15, 0.6],
  [-0.35, -1.4],
];
const BOMBS = [WISP_SIZE * 2.2, WISP_SIZE * 1.4, WISP_SIZE];
const BLASTS = [820, 430, 340];
const STRING_W = 3;
const ARM_W = 6;
// each blast bursts into a cluster of CLUSTER this far round it
const CLUSTER = 3;
const CLUSTER_REACH = 120;
const CLUSTER_BLAST = 200;
const CLUSTER_GAP = 60;
const RING = 6;
const RING_REACH = 260;
const RING_BLAST = 340;
const RING_GAP = 50;
const DEPTH = 0.15;
const SHAKES = [0, 1.2, 0.9];
const CLUSTER_SHAKE = 0.45;
const RING_SHAKE = 1;

interface Bomb {
  tier: number;
  // which arm end at each tier (1 or -1), and when it blows
  sides: number[];
  blowsAt: number;
  at: (ms: number) => Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombMobileEvent = registerWispEvent(
  KEY,
  "Bomb Mobile",
  () => CONFIG.bombMobileEvent.chance,
  (floor, context, area) => {
    const { dropMs, spinMs, tipGapMs, midGapMs, fallMs, holdMs, mergeMs } =
      CONFIG.bombMobileEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const anchor: Point = { x: bar.center.x, y: area.top };
    const turnAt = (tier: number, ms: number) => {
      const [a, b] = TURN_HZ[tier];
      const s = ms / 1000;
      const span = (dropMs + spinMs) / 1000;
      return (
        Math.PI * 2 * (a * s + ((b - a) * s * s) / (2 * span)) + tier * 0.7
      );
    };
    const drop = (ms: number) => easeOutBack(clamp01(ms / dropMs));

    // the hub of each tier for the bomb down that path of arm ends
    const hubOf = (sides: number[], ms: number, into: Point): Point => {
      const d = drop(ms);
      into.x = anchor.x;
      into.y = anchor.y + STRINGS[0] * d;
      for (let t = 0; t < sides.length; t++) {
        into.x += sides[t] * ARMS[t] * Math.cos(turnAt(t, ms));
        into.y += STRINGS[t + 1] * d;
      }
      return into;
    };
    const tipsAt = dropMs + spinMs;
    const midsAt = tipsAt + 4 * tipGapMs + midGapMs;
    const fallsAt = midsAt + midGapMs + 150;
    const landsAt = fallsAt + fallMs;
    const paths = [
      [[]],
      [[-1], [1]],
      [
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ],
    ];
    const bombs: Bomb[] = paths.flatMap((group, tier) =>
      group.map((sides, k) => {
        const spot: Point = { x: 0, y: 0 };
        const blowsAt =
          tier === 0
            ? landsAt
            : tier === 1
              ? midsAt + k * midGapMs
              : tipsAt + k * tipGapMs;
        const hang = BOMBS[tier] * 0.6;
        return {
          tier,
          sides,
          blowsAt,
          at: (ms: number) => {
            hubOf(sides, Math.min(ms, tier === 0 ? fallsAt : ms), spot);
            spot.y += hang;
            if (tier === 0 && ms > fallsAt)
              spot.y = lerp(
                [spot.y, bar.center.y],
                easeIn(clamp01((ms - fallsAt) / fallMs)),
              );
            return spot;
          },
        };
      }),
    );
    const blasts: Blast[] = [];
    for (const b of bombs) {
      const at = { ...b.at(b.blowsAt) };
      blasts.push({
        at,
        ms: b.blowsAt,
        size: BLASTS[b.tier],
        shake: SHAKES[b.tier],
      });
      const count = b.tier === 0 ? RING : CLUSTER;
      const reach = b.tier === 0 ? RING_REACH : CLUSTER_REACH;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + Math.random() * 0.5;
        blasts.push({
          at: {
            x: at.x + Math.cos(a) * reach,
            y: at.y + Math.sin(a) * reach * 0.7,
          },
          ms: b.blowsAt + 70 + k * (b.tier === 0 ? RING_GAP : CLUSTER_GAP),
          size: b.tier === 0 ? RING_BLAST : CLUSTER_BLAST,
          shake: b.tier === 0 ? RING_SHAKE : CLUSTER_SHAKE,
        });
      }
    }
    const endMs = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;

    const swinging = createBeats(
      [0, fallsAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.ms === landsAt && b.size === BLASTS[0]) {
          cover!.tierUp(bar, b.at);
          cover!.slam(bar);
          cover!.blast(b.at);
          return;
        }
        if (!cover!.isLive()) return;
        shakeScreen(b.shake);
        if (b.size >= CLUSTER_BLAST * 2 || b.shake >= RING_SHAKE)
          playExplosion();
      },
    );

    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landsAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          swinging.tick(ms, now);
          blasting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          // strings and arms, down every path still holding a bomb
          if (ms < fallsAt) {
            hubOf([], ms, a);
            drawBeam(ctx, anchor, a, STRING_W, 0.6);
            for (const s of [-1, 1]) {
              const live = bombs.some(
                (bomb) =>
                  bomb.tier > 0 && bomb.sides[0] === s && ms < bomb.blowsAt,
              );
              if (!live) continue;
              hubOf([s], ms, b);
              c.x = b.x;
              c.y = a.y;
              drawBeam(ctx, a, c, ARM_W, 0.6);
              drawBeam(ctx, c, b, STRING_W, 0.6);
              for (const t of [-1, 1]) {
                const tip = bombs.find(
                  (bomb) =>
                    bomb.tier === 2 &&
                    bomb.sides[0] === s &&
                    bomb.sides[1] === t,
                )!;
                if (ms >= tip.blowsAt) continue;
                hubOf([s, t], ms, c);
                a.x = c.x;
                a.y = b.y;
                drawBeam(ctx, b, a, ARM_W * 0.7, 0.6);
                drawBeam(ctx, a, c, STRING_W, 0.6);
                hubOf([], ms, a);
              }
            }
          }
          for (const bomb of bombs) {
            if (ms >= bomb.blowsAt) continue;
            const at = bomb.at(ms);
            const depth =
              bomb.tier === 0
                ? 1
                : 1 +
                  DEPTH *
                    Math.sin(turnAt(bomb.tier - 1, ms)) *
                    bomb.sides[bomb.tier - 1];
            const size = BOMBS[bomb.tier] * drop(ms) * depth;
            drawLitFuse(ctx, at, clamp01(ms / bomb.blowsAt), size * 1.4, now);
            drawWisp(ctx, bomb.at, ms, now, size, clamp01(ms / bomb.blowsAt));
          }
          for (const blast of blasts)
            drawDetonation(ctx, blast.at, ms - blast.ms, blast.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
