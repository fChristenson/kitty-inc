// the "Rainy Window" event (experiment: rain runs down the screen's glass;
// cash): it covers its crit, whose click freezes the screen and fat drops
// of rain splat onto the glass one after another, each a little lens
// showing the screen upside down; they cling, then slide down in jerky
// runs, merging as they go, faster and faster, and every drop that runs off
// the bottom bursts with a splash and a jolt into a stream of cash pouring
// up into the total; the last one off in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "rainyWindow";
const REWARD = 4;
const DROPS = 12;
const SIZE: [number, number] = [26, 50];
// each drop shows this much more of the screen behind it than it covers
const ZOOM = 2.2;
const CLING: [number, number] = [120, 380];
// the slide down: stutters sideways and grows as it gathers smaller drops
const STUTTER = 18;
const GATHER = 1.35;
const SPLAT_MS = 90;
const FILM = "rgba(255,255,255,0.07)";
const SHINE = fadeStops(COLOR.white, 0.2);
const BOTTOM = 40;
const RUN_SHAKE: [number, number] = [0.3, 0.9];

interface Drop {
  x: number;
  y: number;
  r: number;
  lands: number;
  slides: number;
  offs: number;
  sway: number;
}

export const forceRainyWindowEvent = registerWispEvent(
  KEY,
  "Rainy Window",
  () => CONFIG.rainyWindowEvent.chance,
  (floor, context, area) => {
    const { dropsMs, slideMs, holdMs, mergeMs } = CONFIG.rainyWindowEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const floorY = area.bottom - BOTTOM;
    let clock = 0;
    const drops: Drop[] = Array.from({ length: DROPS }, (_, i) => {
      const lands = clock;
      clock += lerp(dropsMs, i / (DROPS - 1));
      const slides = lands + between(CLING);
      return {
        x: left + width * between([0.08, 0.92]),
        y: top + height * between([0.1, 0.6]),
        r: between(SIZE),
        lands,
        slides,
        offs: slides + lerp(slideMs, i / (DROPS - 1)),
        sway: Math.random() * Math.PI * 2,
      };
    });
    const endAt = Math.max(...drops.map((d) => d.offs));
    const last = drops.find((d) => d.offs === endAt)!;
    const pour: Pour = {
      coinsAlong: 260,
      width: 30,
      streamMs: 220,
      travelMs: 650,
    };
    const streams = drops.map((d) => {
      const from: Point = { x: d.x, y: floorY };
      return sampleLine(
        (u) => ({
          x:
            lerp([from.x, total.x], u) +
            Math.sin(Math.PI * u) * (from.x < total.x ? -150 : 150),
          y: lerp([from.y, total.y], u),
        }),
        24,
      );
    });
    const at: Point = { x: 0, y: 0 };
    // where a drop is at ms, and how big
    const dropAt = (d: Drop, ms: number): number => {
      const u = easeIn(clamp01((ms - d.slides) / (d.offs - d.slides)));
      at.x = d.x + (u > 0 ? Math.sin(ms * 0.02 + d.sway) * STUTTER * u : 0);
      at.y = lerp([d.y, floorY + d.r], u);
      return (
        d.r * lerp([1, GATHER], u) * easeOut(clamp01((ms - d.lands) / SPLAT_MS))
      );
    };

    let shot: ScreenCopy | null = null;
    const running = createBeats(
      drops,
      (d) => d.offs,
      (d, k) => {
        pourLine(cover!, streams[k], pour);
        if (d === last) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst({ x: d.x, y: floorY }, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(RUN_SHAKE, k / (DROPS - 1)));
      },
    );
    const splatting = createBeats(
      drops,
      (d) => d.lands,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: endAt + pour.streamMs + pour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          splatting.tick(ms, now);
          running.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.fillStyle = FILM;
          ctx.fillRect(left, top, width, height);
          for (const d of drops) {
            if (ms < d.lands || ms >= d.offs) continue;
            const r = dropAt(d, ms);
            if (r <= 0) continue;
            // a little lens: the screen round it, shrunk and upside down
            const view = r * ZOOM;
            ctx.save();
            ctx.beginPath();
            ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.translate(at.x, at.y);
            ctx.scale(1, -1);
            drawScreenPart(
              ctx,
              shot,
              at.x - view,
              at.y - view,
              view * 2,
              view * 2,
              -r,
              -r,
              r * 2,
              r * 2,
            );
            ctx.restore();
            ctx.globalCompositeOperation = "lighter";
            drawGlow(ctx, SHINE, at.x - r * 0.35, at.y - r * 0.4, r * 0.45);
            ctx.globalCompositeOperation = "source-over";
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
