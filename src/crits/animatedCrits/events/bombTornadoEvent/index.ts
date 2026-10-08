// the "Bomb Tornado" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a tornado of lit bomb wisps spins up out of
// the bottom of the screen, a funnel widening as it rises, whirling ever
// faster with every fuse fizzing; bombs start flying off its rim one by one,
// each slung out and going off in a big blast that bursts into a cluster of
// smaller ones, blowing cash everywhere with a bang and a shake, quicker and
// quicker; then the core of the funnel goes up in a colossal blast. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";

const KEY = "bombTornado";
const REWARD = 4;
const BOMBS = 16;
const RADIUS: [number, number] = [26, 220];
const SQUASH = 0.22;
const HEIGHT = 0.62;
// laps a second, spinning up over the event
const LAPS: [number, number] = [0.6, 2.4];
const FLING_MS = 260;
const FLING = 200;
const BLAST = 190;
const CLUSTER = 3;
const CLUSTER_MS = 90;
const CLUSTER_REACH = 70;
const CLUSTER_SIZE = 90;
const COINS = 10;
const BOMB = 0.5;
const FUSE = 26;
const BLAST_SHAKE: [number, number] = [0.6, 1.5];

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceBombTornadoEvent = registerWispEvent(
  KEY,
  "Bomb Tornado",
  () => CONFIG.bombTornadoEvent.chance,
  (floor, context, area) => {
    const { spinUpMs, flingsMs, holdMs, mergeMs } = CONFIG.bombTornadoEvent;
    const base: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - 90,
    };
    const height = (area.bottom - area.top) * HEIGHT;
    let clock = spinUpMs;
    const flungAt: number[] = [];
    for (let k = 0; k < BOMBS; k++) {
      flungAt.push(clock);
      clock += lerp(flingsMs, k / (BOMBS - 1));
    }
    const coreAt = clock + FLING_MS;
    const endAt = coreAt;
    const turnAt = (ms: number) => {
      const s = Math.min(ms, coreAt) / 1000;
      const span = coreAt / 1000;
      return (
        Math.PI * 2 * (LAPS[0] * s + ((LAPS[1] - LAPS[0]) * s * s) / (2 * span))
      );
    };
    const orbit = (h: number, phase: number, ms: number, into: Point) => {
      const a = phase + turnAt(ms);
      const r = lerp(RADIUS, h);
      into.x = base.x + Math.cos(a) * r;
      into.y = base.y - h * height + Math.sin(a) * r * SQUASH;
      return a;
    };
    // the top of the funnel flies off first
    const bombs = Array.from({ length: BOMBS }, (_, i) => {
      const h = 1 - i / (BOMBS - 1);
      const phase = i * 2.39996;
      const flings = flungAt[i];
      const from: Point = { x: 0, y: 0 };
      const a = orbit(h, phase, flings, from);
      // slung off along its spin, and outward
      const away = { x: -Math.sin(a) + Math.cos(a), y: Math.cos(a) * SQUASH };
      const length = Math.hypot(away.x, away.y) || 1;
      const lands: Point = {
        x: from.x + (away.x / length) * FLING,
        y: Math.min(area.bottom - 40, from.y + (away.y / length) * FLING),
      };
      const spot: Point = { x: 0, y: 0 };
      return {
        h,
        phase,
        flings,
        blows: flings + FLING_MS,
        lands,
        at: (ms: number): Point | null => {
          const t = Math.max(0, ms);
          if (t < flings) {
            orbit(h, phase, t, spot);
            return spot;
          }
          if (t >= flings + FLING_MS) return null;
          const u = easeOut((t - flings) / FLING_MS);
          spot.x = lerp([from.x, lands.x], u);
          spot.y = lerp([from.y, lands.y], u) - Math.sin(Math.PI * u) * 40;
          return spot;
        },
      };
    });
    const blasts: Blast[] = bombs.flatMap((b, k) => [
      { at: b.lands, ms: b.blows, size: BLAST },
      ...Array.from({ length: CLUSTER }, (_, c) => {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        return {
          at: {
            x: b.lands.x + Math.cos(a) * CLUSTER_REACH,
            y: b.lands.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: b.blows + CLUSTER_MS + c * 30,
          size: CLUSTER_SIZE,
        };
      }),
    ]);
    const core: Point = { x: base.x, y: base.y - height * 0.4 };

    const blowing = createBeats(
      bombs,
      (b) => b.blows,
      (b, k) => {
        cover!.launchFrom(
          b.lands,
          clampTargetsY(
            ringTargets(b.lands, COINS, [60, 220]),
            area.top + 40,
            area.bottom - 30,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / (BOMBS - 1)));
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => cover!.blast(core),
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
          for (const b of bombs) {
            if (ms >= b.blows) continue;
            const at = b.at(ms);
            if (!at) continue;
            drawLitFuse(ctx, at, clamp01(ms / b.blows), FUSE, now);
            drawWispHead(ctx, b.at, ms, now, WISP_SIZE * BOMB);
          }
          for (const blast of blasts)
            drawDetonation(ctx, blast.at, ms - blast.ms, blast.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
