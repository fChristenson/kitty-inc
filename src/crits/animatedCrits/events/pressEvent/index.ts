// the "Press" event: it covers its crit, whose click freezes the screen while
// two glowing plates slam in from the screen's top and bottom onto the
// clicked floor's income bar, bounce back off it and slam again, twice, then
// slam a third time and grind it down, rumbling, until it's almost gone;
// then the bar explodes back out in a huge blast, throwing the plates back
// off the screen and bursting coins every way, which merge into the total.
// Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import type { Point } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01, easeOut, easeIn } from "../../../../shared/easing";

const KEY = "press";
const REWARD = 3;
// the plates: glowing slabs PLATE px thick, starting just off the screen
const PLATE = 46;
const PLATE_LAYERS = [
  [1, COLOR.heavenlyGold, 0.25],
  [0.55, COLOR.heavenlyGold, 0.7],
] as const;
const EDGE_GLOW = 6;
// how flat each slam squashes the bar (of its height), how far the plates
// bounce back off it (px past where they hit), and how flat the grind leaves
// it, the plates juddering GRIND_JUDDER px as they grind
const SQUASHES = [0.7, 0.6, 0.5];
const BOUNCE = 70;
const CRUSHED = 0.06;
const GRIND_JUDDER = 3;
// each slam: a bang, a shake, white bursts at the bar's ends and a few coins
// squirting out of them
const SLAM_SHAKES = [1.3, 1.7, 2];
const SLAM_COINS = 4;
const END_BURST = 0.35;
const END_BURST_MS = 360;
const JET: [number, number] = [80, 300];
const JET_RISE = 100;
// the grind rumbles RUMBLES times, ever harder
const RUMBLES = 4;
const RUMBLE_SHAKE: [number, number] = [0.4, 1];
// the explosion: the bar pops out to POP of its size and springs back, a
// blast, a shake and coins bursting every way
const POP = 1.45;
const POP_SPRING_MS = 160;
const BLAST_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;
const BAR_FLASH_MS = 450;
const BLAST_COINS = 44;
const BLAST_R: [number, number] = [120, 460];

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.pressEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { slamMs, bounceMs, reslamMs, grindMs, retractMs, holdMs, mergeMs } =
        CONFIG.pressEvent;
      const box = getIncomeBarBox(context.isGroundFloor);
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const halfW = box.width / 2;
      const halfH = box.height / 2;
      // how far each plate's inner edge is from the bar's middle line: in
      // from off the screen, slamming and bouncing, then grinding it flat
      const far = Math.max(cy - area.top, area.bottom - cy) + PLATE;
      const steps = [
        { ms: slamMs, to: halfH * SQUASHES[0], ease: easeIn },
        { ms: bounceMs, to: halfH * SQUASHES[0] + BOUNCE, ease: easeOut },
        { ms: reslamMs, to: halfH * SQUASHES[1], ease: easeIn },
        { ms: bounceMs, to: halfH * SQUASHES[1] + BOUNCE, ease: easeOut },
        { ms: reslamMs, to: halfH * SQUASHES[2], ease: easeIn },
        { ms: grindMs, to: halfH * CRUSHED, ease: easeIn },
      ];
      const stepEnds: number[] = [];
      steps.reduce((at, step) => {
        stepEnds.push(at + step.ms);
        return at + step.ms;
      }, 0);
      const slamTimes = [stepEnds[0], stepEnds[2], stepEnds[4]];
      const grindFrom = stepEnds[4];
      const blowAt = stepEnds[5];
      const gap = (ms: number): number => {
        let from = far;
        let start = 0;
        for (let i = 0; i < steps.length; i++) {
          const { ms: length, to, ease } = steps[i];
          if (ms < start + length) {
            const d = from + (to - from) * ease((ms - start) / length);
            return ms >= grindFrom
              ? d + Math.sin(ms / 9) * GRIND_JUDDER
              : d;
          }
          from = to;
          start += length;
        }
        // thrown back off the screen by the blast
        return from + (far - from) * easeOut(clamp01((ms - blowAt) / retractMs));
      };
      const startedAt = performance.now();
      const slammedAt: number[] = [];
      let blewAt: number | null = null;

      setIncomePanelsHidden([floor]);
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blowAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          onEnd: () => setIncomePanelsHidden([]),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (
              slammedAt.length < slamTimes.length &&
              ms >= slamTimes[slammedAt.length]
            )
              slam(slammedAt.length, now);
            if (blewAt === null && ms >= blowAt) blow(now);
            const d = gap(ms);
            // squashed by the plates, then popping back out once it's blown
            let scaleY = Math.min(1, d / halfH);
            let scaleX = 1 / Math.sqrt(Math.max(0.25, scaleY));
            if (blewAt !== null) {
              const t = now - blewAt;
              scaleY = scaleX =
                1 + (POP - 1) * Math.exp(-t / POP_SPRING_MS) * Math.cos(t / 45);
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-cx, -cy);
            drawIncomePanel(ctx, floor, context.isGroundFloor, {
              whiteAlpha:
                blewAt === null
                  ? 0
                  : Math.max(0, 1 - (now - blewAt) / BAR_FLASH_MS),
              rotation: 0,
            });
            ctx.restore();

            // the two plates, their inner edges blazing
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            const width = area.right - area.left;
            for (const [share, color, alpha] of PLATE_LAYERS) {
              ctx.globalAlpha = alpha;
              ctx.fillStyle = color;
              const h = PLATE * share;
              ctx.fillRect(area.left, cy - d - h, width, h);
              ctx.fillRect(area.left, cy + d, width, h);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = COLOR.white;
            ctx.fillRect(area.left, cy - d - EDGE_GLOW / 2, width, EDGE_GLOW);
            ctx.fillRect(area.left, cy + d - EDGE_GLOW / 2, width, EDGE_GLOW);
            ctx.restore();

            for (const at of slammedAt)
              for (const side of [-1, 1])
                drawWhiteBurst(
                  ctx,
                  cx + side * halfW * scaleX,
                  cy,
                  (now - at) / END_BURST_MS,
                  END_BURST,
                );
            if (blewAt !== null)
              drawExplosion(
                ctx,
                cx,
                cy,
                now - blewAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
        },
      );
      if (!cover) {
        setIncomePanelsHidden([]);
        return;
      }

      // the grind's rumble, building
      for (let i = 0; i < RUMBLES; i++) {
        const u = i / (RUMBLES - 1);
        setTimeout(
          () => {
            if (cover.isLive()) shakeScreen(lerp(RUMBLE_SHAKE, u));
          },
          grindFrom + (blowAt - grindFrom) * (0.1 + 0.8 * u),
        );
      }

      // on the frame each slam lands: a few coins squirt out of both ends
      function slam(k: number, now: number): void {
        slammedAt.push(now);
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(SLAM_SHAKES[k]);
        const squashedHalfW = halfW / Math.sqrt(SQUASHES[k]);
        for (const side of [-1, 1]) {
          const end: Point = { x: cx + side * squashedHalfW, y: cy };
          cover.launchFrom(
            end,
            Array.from({ length: SLAM_COINS }, () => ({
              x: end.x + side * lerp(JET, Math.random()),
              y: end.y + (Math.random() * 2 - 1) * JET_RISE,
            })),
          );
        }
      }
      // on the frame the bar blows: coins burst every way
      function blow(now: number): void {
        blewAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        const center = { x: cx, y: cy };
        cover.launchFrom(
          center,
          Array.from({ length: BLAST_COINS }, (_, i) => {
            const angle = (i / BLAST_COINS) * Math.PI * 2;
            const r = lerp(BLAST_R, Math.random());
            return {
              x: center.x + Math.cos(angle) * r,
              y: center.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Press", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Press
export function forcePressEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
