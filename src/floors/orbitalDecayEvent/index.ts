// the "Orbital Decay" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a ring of fizzing bomb wisps swings into
// orbit round the clicked floor's button; their orbits decay, the bombs
// whirling faster and tighter as they spiral in, and one after another they
// crash into the button in big blasts, each with its own bang and shake and
// a spray of cash; the last three hit at once in a cluster and one colossal
// blast with the hardest shake of all. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";

const KEY = "orbitalDecay";
const REWARD = 4;
const BOMBS = 8;
const FINAL = 3;
const RADIUS: [number, number] = [180, 300];
const SQUASH = 0.6;
// laps a second, far out and just before impact
const LAPS: [number, number] = [0.5, 3];
const BOMB = 0.4;
const FUSE = 40;
const BLAST = 280;
const CLUSTER = 220;
const CLUSTER_OFF = 90;
const COLOSSAL = 700;
const SPRAY = 30;
const BANG_GAP_MS = 50;
const HIT_SHAKE: [number, number] = [0.8, 1.4];
const FINAL_SHAKE = 2.4;

interface Bomb {
  hits: number;
  at: (ms: number) => Point;
}

export const forceOrbitalDecayEvent = registerWispEvent(
  KEY,
  "Orbital Decay",
  () => CONFIG.orbitalDecayEvent.chance,
  (floor, context, area) => {
    const { firstMs, hitsMs, holdMs, mergeMs } = CONFIG.orbitalDecayEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const centre: Point = {
      x: button.x,
      y: Math.min(button.y, area.bottom - RADIUS[1] * SQUASH - 20),
    };
    let clock: number = firstMs;
    const singles = BOMBS - FINAL;
    const bombs: Bomb[] = Array.from({ length: BOMBS }, (_, i) => {
      const hits = clock;
      if (i < singles - 1) clock += lerp(hitsMs, i / Math.max(1, singles - 2));
      else if (i === singles - 1) clock += lerp(hitsMs, 1) * 1.5;
      const r0 = lerp(RADIUS, Math.random());
      const a0 = (i / BOMBS) * Math.PI * 2;
      const spot: Point = { x: 0, y: 0 };
      return {
        hits,
        // spiralling in, faster the closer it gets
        at: (ms) => {
          const u = clamp01(Math.max(0, ms) / hits);
          const r = r0 * (1 - u * u);
          const turn =
            Math.PI *
            2 *
            (hits / 1000) *
            (LAPS[0] * u + ((LAPS[1] - LAPS[0]) * u * u * u) / 3);
          spot.x = centre.x + Math.cos(a0 + turn) * r;
          spot.y = centre.y + Math.sin(a0 + turn) * r * SQUASH;
          return spot;
        },
      };
    });
    const finalAt = bombs[BOMBS - 1].hits;
    const cluster: Point[] = Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      return {
        x: centre.x + Math.cos(a) * CLUSTER_OFF,
        y: centre.y + Math.sin(a) * CLUSTER_OFF * SQUASH,
      };
    });
    const blasts = [
      ...bombs
        .slice(0, singles)
        .map((b) => ({ at: centre, ms: b.hits, size: BLAST })),
      ...cluster.map((at, i) => ({
        at,
        ms: finalAt + 40 + i * 30,
        size: CLUSTER,
      })),
      { at: centre, ms: finalAt, size: COLOSSAL },
    ];
    const endAt = finalAt + 160 + DETONATION_MS;

    let bang = -Infinity;
    const hitting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.size === COLOSSAL) {
          cover!.blast(centre);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          return;
        }
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, SPRAY, [80, 260]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(
          lerp(HIT_SHAKE, Math.min(1, b.ms / finalAt)) * (b.size / BLAST),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const b of bombs) {
            if (ms >= b.hits) continue;
            drawLitFuse(ctx, b.at(ms), ms / b.hits, FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6 + 0.4 * (ms / b.hits),
              0,
              b.hits,
            );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
