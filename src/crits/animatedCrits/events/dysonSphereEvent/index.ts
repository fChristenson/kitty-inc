// the "Dyson Sphere" event (galaxy-like build; levels + crit tier): it
// covers its crit, whose click freezes the screen while a sun wisp swells at
// the side of the screen and hundreds of gold panels fly in from every edge,
// locking round it band by band from the bottom up, each band a click and a
// jolt, quicker and quicker; the finished sphere blazes, then fires a beam
// onto every bar in view in turn, a blast and free levels each, the clicked
// bar last in a barrage that lifts it a crit tier. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "dysonSphere";
// sizes are shares of the screen's width
const SUN_X = 0.76;
const RADIUS = 0.21;
const PANELS = 240;
const BANDS = 6;
const FIRST_BAND = 300;
// each band's gap to the next, quickening
const BAND_GAPS = [230, 210, 190, 170, 150, 140];
// a panel's flight in, and how early before its band it may lock on
const FLY_MS = 380;
const EARLY_MS = 140;
const FLY_FROM = 1.2;
const TILT = 0.35;
const SPIN = 0.0015;
const PANEL_SIZE = 0.013;
const PANEL_FRONT = 0.01;
const PANEL_BLAZE = 0.011;
const FLYING_SIZE = 0.024;
const SUN_GROWTH = 1.5;
const COMPLETE_LAG = 120;
const BLAZE_MS = 260;
const BAND_FLASH_MS = 150;
const FIRE_LAG = 250;
const BEAM_EVERY = 110;
// a beam shows this long before its hit and fades out after
const BEAM_LEAD = 90;
const BEAM_MS = 290;
const BEAM_WIDTH: [number, number] = [0.064, 0.016];
const HIT_INSET = 0.064;
const HIT_BLAST = 150;
const FINALE_BLASTS = 5;
const FINALE_EVERY = 45;
const FINALE_BLAST = 200;
const FINALE_LAG = 270;
const FINALE_HUGE = 460;
const SHRINK_MS = 200;
const BAND_SHAKE: [number, number] = [0.3, 0.8];
const BLAZE_SHAKE = 1.2;
const HIT_SHAKE = 0.8;
const FINALE_SHAKE = 0.9;
const HUGE_SHAKE = 1.8;
const SOUND_GAP_MS = 55;
const SOFT_GOLD = fadeStops(COLOR.heavenlyGold);

interface Panel {
  y: number;
  r: number;
  theta: number;
  arrive: number;
  from: Point;
}

interface Hit {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forceDysonSphereEvent = registerWispEvent(
  KEY,
  "Dyson Sphere",
  () => CONFIG.dysonSphereEvent.chance,
  (floor, context, area) => {
    const { levelShare, holdMs, mergeMs } = CONFIG.dysonSphereEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const sun: Point = {
      x: area.left + width * SUN_X,
      y: (area.top + area.bottom) / 2,
    };
    const radius = width * RADIUS;

    const bandAt: number[] = [];
    let clock = FIRST_BAND;
    for (const gap of BAND_GAPS) {
      bandAt.push(clock);
      clock += gap;
    }
    const completeAt = bandAt[BANDS - 1] + COMPLETE_LAG;
    const fireAt = completeAt + FIRE_LAG;
    const panels: Panel[] = Array.from({ length: PANELS }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / PANELS;
      const band = Math.min(BANDS - 1, Math.floor(((y + 1) / 2) * BANDS));
      const a = Math.random() * Math.PI * 2;
      return {
        y,
        r: Math.sqrt(1 - y * y),
        theta: i * 2.39996,
        arrive: bandAt[band] - Math.random() * EARLY_MS,
        from: {
          x: sun.x + Math.cos(a) * width * FLY_FROM,
          y: sun.y + Math.sin(a) * width * FLY_FROM,
        },
      };
    });
    const spot = { x: 0, y: 0, z: 0 };
    const sphereAt = (p: Panel, ms: number, r: number) => {
      const angle = p.theta + ms * SPIN;
      const x = Math.cos(angle) * p.r;
      const z = Math.sin(angle) * p.r;
      spot.x = sun.x + x * r;
      spot.y = sun.y - (p.y * Math.cos(TILT) - z * Math.sin(TILT)) * r;
      spot.z = p.y * Math.sin(TILT) + z * Math.cos(TILT);
      return spot;
    };

    // every bar top to bottom, the clicked one last
    const order = [
      ...bars.filter((b) => b !== clicked).sort((a, b) => a.box.y - b.box.y),
      clicked,
    ];
    const hitPoint = (bar: RewardBar): Point => ({
      x: bar.box.x + bar.box.width - width * HIT_INSET,
      y: bar.center.y,
    });
    const hits: Hit[] = order.map((bar, k) => ({
      bar,
      at: hitPoint(bar),
      ms: fireAt + k * BEAM_EVERY,
    }));
    const lastAt = hits[hits.length - 1].ms;
    const finale = Array.from({ length: FINALE_BLASTS }, (_, k) => ({
      at: {
        x: clicked.box.x + clicked.box.width * (1 - (k + 0.5) / FINALE_BLASTS),
        y: clicked.center.y,
      },
      ms: lastAt + FINALE_EVERY * (k + 1),
    }));
    const hugeAt = lastAt + FINALE_LAG;
    const endMs = hugeAt + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const banding = createBeats(
      bandAt,
      (at) => at,
      (_, k) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(BAND_SHAKE, k / (BANDS - 1)));
        playBloop();
      },
    );
    const blazing = createBeats(
      [completeAt],
      (at) => at,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(BLAZE_SHAKE);
        bang(now);
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, _, now) => {
        cover!.levels(h.bar, levels.get(h.bar)!, h.at);
        if (h.bar === clicked) cover!.tierUp(clicked, h.at);
        if (!cover!.isLive()) return;
        shakeScreen(HIT_SHAKE);
        bang(now);
      },
    );
    const finishing = createBeats(
      finale,
      (b) => b.ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(FINALE_SHAKE);
        bang(now);
      },
    );
    const slamming = createBeats(
      [hugeAt],
      (at) => at,
      (_, __, now) => {
        cover!.slam(clicked);
        cover!.blast(clicked.center);
        if (!cover!.isLive()) return;
        shakeScreen(HUGE_SHAKE);
        bang(now);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hugeAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          banding.tick(ms, now);
          blazing.tick(ms, now);
          hitting.tick(ms, now);
          finishing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const build = clamp01(ms / completeAt);
          // the sphere shrinks into its sun once its last beam has fired
          const r = radius * (1 - clamp01((ms - lastAt) / SHRINK_MS));
          if (ms < lastAt + SHRINK_MS)
            drawWisp(
              ctx,
              () => sun,
              ms,
              now,
              WISP_SIZE * (1 + SUN_GROWTH * build),
              build,
            );
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const [k, at] of bandAt.entries()) {
            const since = ms - at;
            if (since < 0 || since >= BAND_FLASH_MS) continue;
            ctx.globalAlpha =
              (1 - since / BAND_FLASH_MS) * (0.4 + k * 0.1) * 0.9;
            drawGlow(ctx, SOFT_GOLD, sun.x, sun.y, radius * 1.4);
          }
          const sinceBlaze = ms - completeAt;
          const blaze =
            sinceBlaze >= 0 && sinceBlaze < BLAZE_MS
              ? 0.9 * (1 - sinceBlaze / BLAZE_MS)
              : 0;
          if (blaze > 0) {
            ctx.globalAlpha = blaze;
            drawGlow(ctx, SOFT_GOLD, sun.x, sun.y, radius * 2.2);
          }
          if (r > 1)
            for (const [i, p] of panels.entries()) {
              const start = p.arrive - FLY_MS;
              if (ms < start) continue;
              const s = sphereAt(p, ms, r);
              const u = clamp01((ms - start) / FLY_MS);
              const depth = (s.z + 1) / 2;
              ctx.globalAlpha = u < 1 ? 1 : 0.4 + 0.6 * depth;
              stampGlimmer(
                ctx,
                lerp([p.from.x, s.x], u * u),
                lerp([p.from.y, s.y], u * u),
                width *
                  (u < 1
                    ? FLYING_SIZE
                    : PANEL_SIZE + PANEL_FRONT * depth + PANEL_BLAZE * blaze),
                i,
                blaze > 0.3 || depth > 0.6 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
          ctx.restore();
          for (const h of hits) {
            const since = ms - h.ms + BEAM_LEAD;
            if (since < 0 || since >= BEAM_MS) continue;
            const t = since / BEAM_MS;
            drawBeam(ctx, sun, h.at, width * lerp(BEAM_WIDTH, t), 1 - t);
          }
          for (const h of hits)
            drawDetonation(ctx, h.at, ms - h.ms, HIT_BLAST, now);
          for (const b of finale)
            drawDetonation(ctx, b.at, ms - b.ms, FINALE_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - hugeAt, FINALE_HUGE, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
