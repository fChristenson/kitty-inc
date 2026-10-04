// the "Interference" event (explosion; cash): it covers its crit, whose
// click freezes the screen while three fizzing bomb wisps drop onto the
// screen far apart and go off one after another in big blasts, each
// throwing out a glittering shockwave ring that races across the screen;
// wherever two rings cross, the crossing point goes off too, so chains of
// blasts rip along curving lines between them, each with its own bang and
// shake and spray of cash, clusters bursting where all three meet, until
// the rings close on the middle in one colossal blast. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";

const KEY = "interference";
const REWARD = 4;
// the bombs' spots, as shares of the screen across and down
const SPOTS: Point[] = [
  { x: 0.22, y: 0.3 },
  { x: 0.8, y: 0.38 },
  { x: 0.45, y: 0.78 },
];
const DROP_MS = 220;
// px per ms the rings race out
const SPEED = 1.3;
const STEP_MS = 80;
const MAX_CROSSINGS = 30;
const RING_DOTS = 44;
const BIG = 340;
const CROSS = 130;
const CLUSTER = 220;
const COLOSSAL = 720;
const TRIPLE = 40;
const BOMB = 0.45;
const FUSE = 40;
const BANG_GAP_MS = 50;
const SOURCE_SHAKE = 1.3;
const CROSS_SHAKE = 0.35;
const CLUSTER_SHAKE = 0.9;
const FINAL_SHAKE = 2.6;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceInterferenceEvent = registerWispEvent(
  KEY,
  "Interference",
  () => CONFIG.interferenceEvent.chance,
  (floor, context, area) => {
    const { blowsMs, ringMs, holdMs, mergeMs } = CONFIG.interferenceEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const sources = SPOTS.map((share, i) => ({
      at: {
        x: area.left + width * share.x,
        y: area.top + height * share.y,
      },
      blows: blowsMs[i],
    }));
    const finalAt = blowsMs[blowsMs.length - 1] + ringMs;
    const centre: Point = {
      x: sources.reduce((s, b) => s + b.at.x, 0) / sources.length,
      y: sources.reduce((s, b) => s + b.at.y, 0) / sources.length,
    };
    const inside = (p: Point) =>
      p.x > area.left + 30 &&
      p.x < area.right - 30 &&
      p.y > area.top + 30 &&
      p.y < area.bottom - 30;
    const blasts: Blast[] = sources.map((s) => ({
      at: s.at,
      ms: s.blows,
      size: BIG,
      shake: SOURCE_SHAKE,
      coins: 30,
    }));
    // where each pair of rings crosses, stepping through time
    const crossings: Blast[] = [];
    for (let i = 0; i < sources.length; i++)
      for (let j = i + 1; j < sources.length; j++) {
        const a = sources[i];
        const b = sources[j];
        const dx = b.at.x - a.at.x;
        const dy = b.at.y - a.at.y;
        const d = Math.hypot(dx, dy);
        for (let ms = Math.max(a.blows, b.blows); ms < finalAt; ms += STEP_MS) {
          const ra = (ms - a.blows) * SPEED;
          const rb = (ms - b.blows) * SPEED;
          if (ra + rb < d || Math.abs(ra - rb) > d) continue;
          const along = (ra * ra - rb * rb + d * d) / (2 * d);
          const off = Math.sqrt(Math.max(0, ra * ra - along * along));
          for (const side of [-1, 1]) {
            const at: Point = {
              x: a.at.x + (dx * along) / d - (side * dy * off) / d,
              y: a.at.y + (dy * along) / d + (side * dx * off) / d,
            };
            if (!inside(at)) continue;
            // on the third ring too: a cluster
            const triple = sources.some(
              (s, k) =>
                k !== i &&
                k !== j &&
                ms > s.blows &&
                Math.abs(
                  Math.hypot(at.x - s.at.x, at.y - s.at.y) -
                    (ms - s.blows) * SPEED,
                ) < TRIPLE,
            );
            crossings.push({
              at,
              ms,
              size: triple ? CLUSTER : CROSS,
              shake: triple ? CLUSTER_SHAKE : CROSS_SHAKE,
              coins: triple ? 16 : 6,
            });
          }
        }
      }
    crossings.sort((p, q) => p.ms - q.ms);
    const stride = Math.max(1, Math.ceil(crossings.length / MAX_CROSSINGS));
    blasts.push(
      ...crossings.filter((c, i) => c.size === CLUSTER || i % stride === 0),
    );
    blasts.push({
      at: centre,
      ms: finalAt,
      size: COLOSSAL,
      shake: FINAL_SHAKE,
      coins: 0,
    });
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
      blasts.push({
        at: {
          x: centre.x + Math.cos(a) * 110,
          y: centre.y + Math.sin(a) * 110,
        },
        ms: finalAt + 50 + c * 35,
        size: CLUSTER,
        shake: CLUSTER_SHAKE,
        coins: 12,
      });
    }
    const final = blasts.find((b) => b.size === COLOSSAL)!;
    const endAt = finalAt + 200 + DETONATION_MS;
    const bombs = sources.map((s) => {
      const spot: Point = { x: s.at.x, y: s.at.y };
      const from = s.blows - DROP_MS * 2;
      return {
        s,
        from,
        at: (ms: number): Point => {
          const u = clamp01((ms - from) / DROP_MS);
          spot.y = s.at.y - (1 - u * u) * 300;
          return spot;
        },
      };
    });

    let bang = -Infinity;
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b === final) {
          cover!.blast(b.at);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(b.shake);
          return;
        }
        if (b.coins > 0)
          cover!.launchFrom(
            b.at,
            clampTargetsY(
              sprayTargets(b.at, b.coins, [60, 220]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        if (!cover!.isLive()) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => blasting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const b of bombs) {
            if (ms < b.from || ms >= b.s.blows) continue;
            const at = b.at(ms);
            drawLitFuse(
              ctx,
              at,
              (ms - b.from) / (b.s.blows - b.from),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.7,
              b.from,
              b.s.blows,
            );
          }
          // the shockwave rings, fading as they spread
          for (const s of sources) {
            const r = (ms - s.blows) * SPEED;
            if (r <= 0 || ms > finalAt) continue;
            const fade = 1 - clamp01((ms - s.blows) / (finalAt - s.blows));
            for (let i = 0; i < RING_DOTS; i++) {
              const a = (i / RING_DOTS) * Math.PI * 2 + s.blows;
              drawGlitterLight(
                ctx,
                s.at.x + Math.cos(a) * r,
                s.at.y + Math.sin(a) * r,
                lerp([10, 6], 1 - fade),
                i + 900,
                fade,
                now,
              );
            }
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
