// the "Slash" event: it covers its crit, whose click freezes the screen while
// three lightning-fast cuts rip across it one after another (the wisp
// streaking edge to edge, leaving a glowing cut), each with a swoosh and a
// jolt; the cuts smoulder ever brighter for a beat, then all burst open at
// once in a blinding flare, bang and huge shake, blasting coins out along
// every cut, which sweep into the total. Pays floor income × floor number
// × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSlamExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";

const KEY = "slash";
const REWARD = 3;
// the cuts: through points near the screen's middle (within MIDDLE of its
// size), at angles spread round from a random start, running off both edges
const CUTS = 3;
const MIDDLE = 0.25;
const ANGLE_JITTER = 0.35;
const SLASH_SHAKE = 0.6;
// a cut glows from a thin line to SMOULDER times as bright before it bursts,
// then flares FLARE times as wide and fades over FLARE_MS
const CUT_LAYERS = [
  [16, COLOR.heavenlyGold, 0.3],
  [6, COLOR.heavenlyGold, 0.85],
  [2, COLOR.white, 1],
] as const;
const SMOULDER = 1.6;
const FLARE = 5;
const FLARE_MS = 350;
const BURST_SHAKE = 2.6;
// coins blasted out along each cut, landing up to SPRAY px either side of it
const COINS_PER_CUT = 22;
const SPRAY: [number, number] = [40, 240];

interface Cut {
  from: Point;
  to: Point;
  at: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.slashEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { slashMs, gapMs, smoulderMs, holdMs, mergeMs } = CONFIG.slashEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const half = Math.hypot(width, height) / 2 + 80;
      const start = Math.random() * Math.PI;
      const cuts: Cut[] = Array.from({ length: CUTS }, (_, i) => {
        const angle =
          start + (i / CUTS) * Math.PI + (Math.random() - 0.5) * ANGLE_JITTER;
        const mid = {
          x: area.left + width * (0.5 + (Math.random() - 0.5) * MIDDLE * 2),
          y: area.top + height * (0.5 + (Math.random() - 0.5) * MIDDLE * 2),
        };
        // alternate which end each cut starts from, for a criss-cross feel
        const dir = i % 2 === 0 ? 1 : -1;
        return {
          from: {
            x: mid.x - Math.cos(angle) * half * dir,
            y: mid.y - Math.sin(angle) * half * dir,
          },
          to: {
            x: mid.x + Math.cos(angle) * half * dir,
            y: mid.y + Math.sin(angle) * half * dir,
          },
          at: i * gapMs,
        };
      });
      const burstAt = (CUTS - 1) * gapMs + slashMs + smoulderMs;
      const along = (cut: Cut, s: number): Point => ({
        x: cut.from.x + (cut.to.x - cut.from.x) * s,
        y: cut.from.y + (cut.to.y - cut.from.y) * s,
      });
      const startedAt = performance.now();
      let slashed = 0;
      let burstedAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: burstAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (slashed < CUTS && ms >= cuts[slashed].at) {
              slashed++;
              playSwoosh();
              shakeScreen(SLASH_SHAKE);
            }
            if (burstedAt === null && ms >= burstAt) burst();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const since = burstedAt === null ? null : now - burstedAt;
            const smoulder =
              1 +
              (SMOULDER - 1) *
                Math.min(
                  1,
                  Math.max(0, (ms - (burstAt - smoulderMs)) / smoulderMs),
                );
            const flare =
              since === null ? 0 : Math.max(0, 1 - since / FLARE_MS);
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";
            for (const cut of cuts) {
              const cutMs = ms - cut.at;
              if (cutMs <= 0) continue;
              if (since !== null && flare <= 0) continue;
              const head = along(cut, Math.min(1, cutMs / slashMs));
              for (const [lineWidth, color, alpha] of CUT_LAYERS) {
                ctx.globalAlpha =
                  since === null ? Math.min(1, alpha * smoulder) : flare;
                ctx.lineWidth =
                  lineWidth * (since === null ? 1 : 1 + (FLARE - 1) * flare);
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(cut.from.x, cut.from.y);
                ctx.lineTo(head.x, head.y);
                ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            for (const cut of cuts)
              drawWisp(
                ctx,
                (t) => {
                  const s = (t - cut.at) / slashMs;
                  return s < 0 || s > 1 ? null : along(cut, s);
                },
                ms,
                now,
                WISP_SIZE,
                1,
              );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the cuts burst
      function burst(): void {
        burstedAt = performance.now();
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BURST_SHAKE);
        for (const cut of cuts) {
          const dx = cut.to.x - cut.from.x;
          const dy = cut.to.y - cut.from.y;
          const length = Math.hypot(dx, dy);
          for (let i = 0; i < COINS_PER_CUT; i++) {
            // spread along the stretch of the cut that's on screen
            const from = along(cut, 0.25 + 0.5 * Math.random());
            const side =
              (Math.random() < 0.5 ? -1 : 1) *
              (SPRAY[0] + (SPRAY[1] - SPRAY[0]) * Math.random());
            cover.launchFrom(from, [
              {
                x: from.x + (-dy / length) * side,
                y: from.y + (dx / length) * side,
              },
            ]);
          }
        }
      }
    },
  },
  { label: "Slash", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Slash
export function forceSlashEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
