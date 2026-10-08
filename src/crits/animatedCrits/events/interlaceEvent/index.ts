// the "Interlace" event (experiment: the screen tears into interlaced lines
// like a glitching video signal; cash): it covers its crit, whose click
// freezes the screen and splits it into thin horizontal lines that slide
// apart sideways, every other line the other way, rippling like a bad
// signal; three jolts tear them wider and wider, gold blazing through the
// gaps and cash gushing out of the screen's ragged edges with each; then
// every line snaps back into place at once in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawDetonation } from "../../../../shared/explosion";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "interlace";
const REWARD = 4;
const LINES = 32;
// how far the lines slide after each jolt, as a share of the screen's width
const TEAR = [0.06, 0.13, 0.24];
const RIPPLE = 0.4;
const JOLT_MS = 160;
const SNAP_MS = 140;
const EDGE_SPRAYS = 4;
const SPRAY = 14;
const COLOSSAL = 560;
const VOID = "rgba(0,0,0,0.9)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const JOLT_SHAKE: [number, number] = [0.7, 1.4];
const SNAP_SHAKE = 2.3;

export const forceInterlaceEvent = registerWispEvent(
  KEY,
  "Interlace",
  () => CONFIG.interlaceEvent.chance,
  (floor, context, area) => {
    const { joltsMs, tornMs, holdMs, mergeMs } = CONFIG.interlaceEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const lineH = height / LINES;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const total = totalSpot(area);
    let clock = 0;
    const jolts = TEAR.map((tear, k) => {
      const at = clock;
      clock += lerp(joltsMs, k / (TEAR.length - 1));
      return { at, tear, from: k === 0 ? 0 : TEAR[k - 1] };
    });
    const snapsAt = jolts[jolts.length - 1].at + JOLT_MS + tornMs;
    const endAt = snapsAt + SNAP_MS;
    const tearAt = (ms: number) => {
      if (ms >= snapsAt)
        return (
          TEAR[TEAR.length - 1] *
          (1 - easeIn(clamp01((ms - snapsAt) / SNAP_MS)))
        );
      let s = 0;
      for (const j of jolts)
        if (ms >= j.at)
          s = lerp(
            [j.from, j.tear],
            easeOutBack(clamp01((ms - j.at) / JOLT_MS)),
          );
      return s;
    };
    const pour: Pour = {
      coinsAlong: 150,
      width: 30,
      streamMs: 260,
      travelMs: 600,
    };
    const into: Point = { x: 0, y: 0 };
    // out of the ragged left and right edges, curling up into the total
    const rivers = [-1, 1].map((side) => {
      const from: Point = {
        x: side < 0 ? left + 30 : area.right - 30,
        y: mid.y,
      };
      const bend: Point = { x: from.x, y: lerp([from.y, total.y], 0.6) };
      return sampleLine((u) => ({ ...bezier(from, bend, total, u, into) }), 24);
    });

    let shot: ScreenCopy | null = null;
    const jolting = createBeats(
      jolts,
      (j) => j.at,
      (_, k) => {
        for (const line of rivers) pourLine(cover!, line, pour);
        for (let i = 0; i < EDGE_SPRAYS; i++) {
          const at: Point = {
            x: i % 2 ? area.right - 20 : left + 20,
            y: top + height * (0.2 + 0.6 * Math.random()),
          };
          cover!.launchFrom(
            at,
            clampTargetsY(
              sprayTargets(
                at,
                SPRAY,
                [80, 240],
                i % 2 ? Math.PI : 0,
                Math.PI * 0.8,
              ),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(JOLT_SHAKE, k / (jolts.length - 1)));
      },
    );
    const snapping = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(SNAP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(
            endAt + 600,
            pourDurationMs(jolts[jolts.length - 1].at, pour),
          ) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          jolting.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          const tear = tearAt(t) * width;
          if (tear === 0) return;
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = clamp01(tear / (TEAR[0] * width));
          drawGlow(ctx, GOLD, mid.x, mid.y, width * 0.8);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          for (let i = 0; i < LINES; i++) {
            const y = top + i * lineH;
            const ripple = 1 - RIPPLE + RIPPLE * Math.sin(i * 0.7 + t * 0.012);
            const dx = (i % 2 ? 1 : -1) * tear * ripple;
            drawScreenPart(
              ctx,
              shot,
              left,
              y,
              width,
              lineH,
              left + dx,
              y,
              width,
              lineH,
            );
          }
        },
        drawOver: (ctx, ms, now) =>
          drawDetonation(ctx, mid, ms - endAt, COLOSSAL, now),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
