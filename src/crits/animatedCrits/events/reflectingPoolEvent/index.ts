// the "Reflecting Pool" event (experiment: a pool rises over the screen,
// mirroring it; cash): it covers its crit, whose click freezes the screen
// and a pool of water rises up over its lower half, the screen above
// mirrored upside down in it and rippling; cash pours down into it in
// streams, every splash a jolt sending rings out across the surface, the
// reflection wobbling harder, then it all gushes up into the total in a
// huge blast and shake as the pool drains away. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "reflectingPool";
const REWARD = 4;
// the pool rises to this share of the way up the screen
const LEVEL = 0.55;
const STRIPS = 28;
const WAVE = 0.045;
const RIPPLE: [number, number] = [4, 22];
const WATER = "rgba(0,0,0,0.3)";
const SHEEN = COLOR.heavenlyGold;
const SHEEN_ALPHA = 0.12;
const STREAMS = 6;
const RINGS = 14;
const RING_MS = 700;
const RING_REACH = 180;
const SPRAY = 14;
const SPLASH_SHAKE: [number, number] = [0.4, 1];

export const forceReflectingPoolEvent = registerWispEvent(
  KEY,
  "Reflecting Pool",
  () => CONFIG.reflectingPoolEvent.chance,
  (floor, context, area) => {
    const { riseMs, streamsMs, drainMs, holdMs, mergeMs } =
      CONFIG.reflectingPoolEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const surface = top + height * (1 - LEVEL);
    let clock: number = riseMs * 0.6;
    const streams = Array.from({ length: STREAMS }, (_, i) => {
      const x = left + width * between([0.12, 0.88]);
      const starts = clock;
      clock += lerp(streamsMs, i / (STREAMS - 1));
      return {
        x,
        starts,
        line: sampleLine((u) => ({ x, y: lerp([top - 40, surface], u) }), 12),
        // where it splashes, and when
        at: { x, y: surface } as Point,
        splashes: 0,
      };
    });
    const pour: Pour = {
      coinsAlong: 300,
      width: 24,
      streamMs: 260,
      travelMs: 360,
    };
    for (const s of streams) s.splashes = s.starts + pour.travelMs;
    const lastSplash = streams[STREAMS - 1].splashes;
    const drainsAt = lastSplash + 200;
    const endAt = drainsAt + drainMs;
    const rise: Point = { x: 0, y: 0 };
    const gush = sampleLine(
      (u) => ({
        x: lerp([left + width / 2, total.x], u),
        y: lerp([surface, total.y], easeOut(u)),
      }),
      20,
    );
    const gushPour: Pour = {
      coinsAlong: 500,
      width: 60,
      streamMs: 400,
      travelMs: 600,
    };
    // how high the water stands at ms
    const waterAt = (ms: number) => {
      if (ms < riseMs)
        return lerp([area.bottom, surface], easeOut(clamp01(ms / riseMs)));
      if (ms < drainsAt) return surface;
      return lerp(
        [surface, area.bottom],
        easeIn(clamp01((ms - drainsAt) / drainMs)),
      );
    };

    let shot: ScreenCopy | null = null;
    const pouring = createBeats(
      streams,
      (s) => s.starts,
      (s) => pourLine(cover!, s.line, pour),
    );
    const splashing = createBeats(
      streams,
      (s) => s.splashes,
      (s, k) => {
        cover!.launchFrom(
          s.at,
          clampTargetsY(
            sprayTargets(s.at, SPRAY, [60, 180], -Math.PI / 2, 1.2),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLASH_SHAKE, k / (STREAMS - 1)));
      },
    );
    const gushing = createBeats(
      [drainsAt],
      (ms) => ms,
      () => pourLine(cover!, gush, gushPour),
    );
    const landing = createBeats(
      [drainsAt + gushPour.travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          drainsAt + gushPour.streamMs + gushPour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          splashing.tick(ms, now);
          gushing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const water = waterAt(Math.max(0, ms));
          const depth = area.bottom - water;
          if (depth <= 1) return;
          // the rippling grows with every splash so far
          let splashed = 0;
          for (const s of streams) if (ms >= s.splashes) splashed++;
          const ripple = lerp(RIPPLE, splashed / STREAMS);
          const strip = depth / STRIPS;
          // mirrored about the surface: each row above shows as far below it
          ctx.save();
          ctx.translate(0, 2 * water);
          ctx.scale(1, -1);
          for (let i = 0; i < STRIPS; i++) {
            const d = i * strip;
            const sway =
              Math.sin(d * WAVE - ms * 0.008) * ripple * (0.3 + d / depth);
            const y = water - d - strip;
            drawScreenPart(
              ctx,
              shot,
              left,
              y,
              width,
              strip,
              left + sway,
              y,
              width,
              strip + 0.5,
            );
          }
          ctx.restore();
          ctx.fillStyle = WATER;
          ctx.fillRect(left, water, width, depth);
          ctx.globalAlpha = SHEEN_ALPHA;
          ctx.fillStyle = SHEEN;
          ctx.fillRect(left, water, width, depth);
          ctx.globalAlpha = 1;
          // rings spreading out from each splash
          for (const s of streams) {
            const t = (ms - s.splashes) / RING_MS;
            if (t < 0 || t >= 1) continue;
            const r = RING_REACH * easeOut(t);
            for (let j = 0; j < RINGS; j++) {
              const a = (j / RINGS) * Math.PI * 2;
              rise.x = s.x + Math.cos(a) * r;
              rise.y = water + Math.sin(a) * r * 0.25;
              drawGlitterLight(ctx, rise.x, rise.y, 9, j, 1 - t, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
