// the "Fortune Teller" event (experiment: a fortune teller; cash): it covers
// its crit, whose click freezes the screen while a crystal-ball wisp swells
// in the middle of the screen, glitter swirling in it ever faster, and
// mystic visions fade in one line after another, "I SEE...", "GREAT
// FORTUNE...", "RICHES!", each a flash and a jolt as a ring of coins
// spirals out of the ball; then the ball cracks in a blinding flash and a
// geyser of cash erupts out of it and arcs over into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, type Bolt } from "../../shared/lightning";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import type { CoinPath } from "../coins";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import { COLOR } from "../../palette";

const KEY = "fortuneTeller";
const REWARD = 4;
const LINES = ["I SEE...", "GREAT FORTUNE...", "RICHES!"];
const RISE = 60;
const FIRST_MS = 260;
const CRACK_GAP_MS = 240;
const BALL: [number, number] = [70, 160];
const ORB: [number, number] = [0.7, 1.4];
const GLOW = fadeStops(COLOR.heavenlyGold, 0.2);
const GLOW_ALPHA = 0.35;
// swirling glitter in the ball: laps a second, quickening
const SWIRL = 20;
const LAPS_HZ: [number, number] = [0.6, 4];
const SWIRL_GLITTER = 10;
const LINE_GAP = 90;
const TEXT_UP = 250;
const STYLE = { fontSize: 60, strokeWidth: 10 };
const RICHES_STYLE = { fontSize: 80, strokeWidth: 12 };
const RING_COINS = 120;
const RING_MS = 460;
const RING_SPIN = 1.6;
const RING_REACH: [number, number] = [240, 440];
const COIN = 0.8;
const CRACKS = 6;
const CRACK_MS = 260;
const LINE_SHAKE: [number, number] = [0.7, 1.2];

export const forceFortuneTellerEvent = registerWispEvent(
  KEY,
  "Fortune Teller",
  () => CONFIG.fortuneTellerEvent.chance,
  (floor, context, area) => {
    const { linesMs, pourMs, holdMs, mergeMs } = CONFIG.fortuneTellerEvent;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + RISE,
    };
    let clock: number = FIRST_MS;
    const visions = LINES.map((label, k) => {
      const at = clock;
      clock += lerp(linesMs, k / (LINES.length - 1));
      const last = k === LINES.length - 1;
      return {
        at,
        k,
        sprite: createCritTextSprite(
          label,
          COLOR.heavenlyGold,
          last ? RICHES_STYLE : STYLE,
        ),
      };
    });
    const crackAt = visions[visions.length - 1].at + CRACK_GAP_MS;
    const radius = (ms: number) => lerp(BALL, easeOut(clamp01(ms / crackAt)));
    const laps = (ms: number) => {
      const s = Math.max(0, ms) / 1000;
      const span = crackAt / 1000;
      return LAPS_HZ[0] * s + ((LAPS_HZ[1] - LAPS_HZ[0]) * s * s) / (2 * span);
    };
    // a ring of coins spiralling out of the ball, the way the glitter swirls
    const ring = (k: number): CoinPath[] => {
      const r0 = BALL[0] + (BALL[1] - BALL[0]) * ((k + 1) / LINES.length);
      const reach = lerp(RING_REACH, k / (LINES.length - 1));
      return Array.from({ length: RING_COINS }, (_, i) => {
        const a0 = (i / RING_COINS) * Math.PI * 2;
        const out = reach * (0.75 + (0.25 * ((i * 7) % 5)) / 4);
        return (f: number) => {
          const e = easeOut(f);
          const a = a0 + e * Math.PI * 2 * RING_SPIN;
          const r = r0 * 0.6 + e * out;
          return {
            x: hub.x + Math.cos(a) * r,
            y: hub.y + Math.sin(a) * r * 0.8,
            scale: COIN,
          };
        };
      });
    };
    const cracks: Bolt[] = Array.from({ length: CRACKS }, (_, i) => {
      const a = (i / CRACKS) * Math.PI * 2 + 0.3;
      const r = BALL[1];
      return createBolt(
        { x: hub.x + Math.cos(a) * r * 0.2, y: hub.y + Math.sin(a) * r * 0.2 },
        { x: hub.x + Math.cos(a) * r * 1.6, y: hub.y + Math.sin(a) * r * 1.6 },
        1,
      );
    });
    const total = totalSpot(area);
    const route: Point[] = [
      hub,
      { x: hub.x, y: hub.y - 280 },
      { x: hub.x + 230, y: Math.min(hub.y - 420, area.top + 380) },
      { x: hub.x + 120, y: total.y + 140 },
      total,
    ];
    const geyser = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 60);
    const pour: Pour = {
      coinsAlong: 1_600,
      width: 52,
      streamMs: pourMs * 0.6,
      travelMs: pourMs,
    };
    const endAt = crackAt + pourMs;
    const durationMs = Math.max(
      pourDurationMs(crackAt, pour),
      endAt + holdMs + mergeMs,
    );
    const orbAt = (): Point => hub;

    const seeing = createBeats(
      visions,
      (v) => v.at,
      (v) => {
        cover!.burst(hub, 0.6 + 0.2 * v.k);
        cover!.trace(ring(v.k), RING_MS);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LINE_SHAKE, v.k / (LINES.length - 1)));
      },
    );
    const cracking = createBeats(
      [crackAt],
      (ms) => ms,
      () => {
        cover!.burst(hub, 2.2);
        pourLine(cover!, geyser, pour);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.6);
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
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          seeing.tick(ms, now);
          cracking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > crackAt + CRACK_MS * 2) return;
          if (ms < crackAt) {
            const r = radius(ms);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = GLOW_ALPHA * clamp01(ms / FIRST_MS);
            drawGlow(ctx, GLOW, hub.x, hub.y, r * 1.5);
            ctx.restore();
            const turn = laps(ms) * Math.PI * 2;
            for (let i = 0; i < SWIRL; i++) {
              const a = turn + (i / SWIRL) * Math.PI * 2;
              const d = r * (0.35 + (0.55 * ((i * 3) % 7)) / 6);
              drawGlitterLight(
                ctx,
                hub.x + Math.cos(a) * d,
                hub.y + Math.sin(a) * d * 0.8,
                SWIRL_GLITTER,
                i,
                1,
                now,
              );
            }
            for (const v of visions) {
              const c = (ms - v.at) / 200;
              if (c < 0) continue;
              ctx.globalAlpha = clamp01(c);
              drawCritTextSprite(
                ctx,
                v.sprite,
                hub.x,
                hub.y - TEXT_UP - (LINES.length - 1 - v.k) * LINE_GAP,
                1 + 0.4 * (1 - clamp01(c * 2)),
              );
              ctx.globalAlpha = 1;
            }
          } else {
            const t = (ms - crackAt) / CRACK_MS;
            if (t < 1) for (const b of cracks) drawBolt(ctx, b, 1 - t, 1.4);
          }
          drawWispBetween(
            ctx,
            orbAt,
            ms,
            now,
            WISP_SIZE * lerp(ORB, clamp01(ms / crackAt)),
            clamp01(ms / crackAt),
            0,
            crackAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
