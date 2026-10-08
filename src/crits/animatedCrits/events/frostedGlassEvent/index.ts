// the "Frosted Glass" event (experiment: the screen frosts over like a cold
// window; cash): it covers its crit, whose click freezes the screen and a
// white frost creeps over the whole of it; a wisp swoops through the frost
// in great loops, wiping a clear trail behind it like a finger on a misted
// window, and every few loops a gush of cash bursts out of the cleared glass
// with a pop and a jolt and pours into the total; then the frost blows away
// in a huge blast and shake at the total. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";

const KEY = "frostedGlass";
const REWARD = 4;
// the frost is kept at 1/SCALE size and stretched soft over the screen
const SCALE = 4;
const FROST = "rgb(236,242,250)";
const FROST_ALPHA = 0.8;
const WIPE = 75;
const WIPE_STEP_MS = 6;
const LOOPS_X = 3;
const LOOPS_Y = 2;
const REACH_X = 0.38;
const REACH_Y = 0.34;
const GUSHES = 6;
const RING = 14;
const WISP = 0.7;
const GUSH_SHAKE: [number, number] = [0.4, 0.9];
const BLOW_SHAKE = 2.2;

export const forceFrostedGlassEvent = registerWispEvent(
  KEY,
  "Frosted Glass",
  () => CONFIG.frostedGlassEvent.chance,
  (floor, context, area) => {
    const { frostMs, wipeMs, blowMs, holdMs, mergeMs } =
      CONFIG.frostedGlassEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const cx = left + width / 2;
    const cy = top + height / 2;
    const wipeEnds = frostMs + wipeMs;
    const blowsAt = wipeEnds;
    const endAt = blowsAt + blowMs;
    // the wiping wisp's loops, a slow figure sweeping the whole screen
    const wiper = (ms: number, into: Point): Point => {
      const u = clamp01((ms - frostMs) / wipeMs);
      into.x = cx + Math.sin(Math.PI * 2 * LOOPS_X * u + 0.6) * width * REACH_X;
      into.y = cy + Math.sin(Math.PI * 2 * LOOPS_Y * u) * height * REACH_Y;
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const wisp = (ms: number) => wiper(ms, head);

    // the frost, and a soft round brush that wipes it away
    const frost = document.createElement("canvas");
    frost.width = Math.ceil(width / SCALE);
    frost.height = Math.ceil(height / SCALE);
    const fc = frost.getContext("2d")!;
    fc.fillStyle = FROST;
    fc.fillRect(0, 0, frost.width, frost.height);
    const r = WIPE / SCALE;
    const brush = document.createElement("canvas");
    brush.width = brush.height = Math.ceil(r * 2);
    const bc = brush.getContext("2d")!;
    const soft = bc.createRadialGradient(r, r, 0, r, r, r);
    soft.addColorStop(0, "rgba(0,0,0,1)");
    soft.addColorStop(0.6, "rgba(0,0,0,0.9)");
    soft.addColorStop(1, "rgba(0,0,0,0)");
    bc.fillStyle = soft;
    bc.fillRect(0, 0, brush.width, brush.height);
    fc.globalCompositeOperation = "destination-out";
    const dab: Point = { x: 0, y: 0 };
    let wipedTo = frostMs;

    const gushes = Array.from({ length: GUSHES }, (_, i) => {
      const ms = frostMs + (wipeMs * (i + 0.7)) / GUSHES;
      const from = wiper(ms, { x: 0, y: 0 });
      return {
        ms,
        from,
        line: sampleLine(
          (u) => ({
            x:
              lerp([from.x, total.x], u) +
              Math.sin(Math.PI * u) * (i % 2 ? 120 : -120),
            y: lerp([from.y, total.y], u),
          }),
          24,
        ),
      };
    });
    const pour: Pour = {
      coinsAlong: 150,
      width: 32,
      streamMs: wipeMs / GUSHES,
      travelMs: 600,
    };

    const gushing = createBeats(
      gushes,
      (g) => g.ms,
      (g, k) => {
        pourLine(cover!, g.line, pour);
        cover!.launchFrom(
          g.from,
          clampTargetsY(
            ringTargets(g.from, RING, [70, 180]),
            top + 40,
            area.bottom - 40,
          ),
        );
        cover!.burst(g.from, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(GUSH_SHAKE, k / (GUSHES - 1)));
      },
    );
    const blowing = createBeats(
      [blowsAt],
      (ms) => ms,
      () => {
        cover!.blast(cover!.total() ?? total);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BLOW_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + pour.travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gushing.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms > endAt) return;
          // wipe the frost along everywhere the wisp passed since last frame
          const to = Math.min(ms, wipeEnds);
          for (; wipedTo < to; wipedTo += WIPE_STEP_MS) {
            wiper(wipedTo, dab);
            fc.drawImage(
              brush,
              (dab.x - left) / SCALE - r,
              (dab.y - top) / SCALE - r,
            );
          }
          const alpha =
            FROST_ALPHA *
            easeOut(clamp01(ms / frostMs)) *
            (1 - clamp01((ms - blowsAt) / blowMs));
          if (alpha <= 0) return;
          ctx.globalAlpha = alpha;
          ctx.drawImage(frost, left, top, width, height);
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE * WISP,
            0.8,
            frostMs * 0.5,
            wipeEnds,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
