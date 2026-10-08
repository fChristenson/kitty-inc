// the "Burrow" event: it covers its crit, whose click freezes the screen while
// the wisp falls right down onto the middle of the clicked floor's upgrade
// button and bores into it, the button bending and warping down at the
// middle ever deeper as it trembles and the screen rumbles, until it explodes
// in a huge blast, springing back, and money bursts out of it to merge into
// the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playExplosion, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  BTN_H,
  BTN_W,
  BTN_X,
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getBtnY,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01 } from "../../../../shared/easing";

const KEY = "burrow";
const REWARD = 3;
// it falls in from this far above the screen
const START_ABOVE = 60;
// the dip it pushes into the button's middle: up to DEPTH px deep, as wide as
// the button, trembling up to TREMBLE px as it deepens
const DEPTH = 64;
const TREMBLE = 3;
// the button's drawn into a scratch canvas this far past its edges (for its
// glow and press shadow) at SCRATCH_RES px per unit, then bent in SLICE-wide
// columns
const PAD = 24;
const SCRATCH_RES = 2;
const SLICE = 8;
// landing on it, and the rumble as it bores in
const LAND_SHAKE = 0.9;
const LAND_BURST = 0.3;
const LAND_BURST_MS = 320;
const RUMBLES = 5;
const RUMBLE_SHAKE: [number, number] = [0.25, 0.9];
// the explosion: the button springs back up past flat, flashing white
const SPRING_BACK = 0.7;
const SPRING_MS = 130;
const FLASH_MS = 450;
const BLAST_SHAKE = 2.6;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;
const COINS = 46;
const COIN_R: [number, number] = [110, 440];


let scratch: HTMLCanvasElement | null = null;
// what the scratch last held, so it's only redrawn when the button's look changes
let scratchOf: { floor: Floor; white: number } | null = null;

// the button bent down `depth` px at its middle, tapering smoothly to its ends
function drawBentButton(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  isGroundFloor: boolean,
  depth: number,
  whiteAlpha: number,
): void {
  const top = getBtnY(isGroundFloor);
  const w = BTN_W + PAD * 2;
  const h = BTN_H + PAD * 2;
  scratch ??= document.createElement("canvas");
  const white = Math.round(whiteAlpha * 20) / 20;
  if (
    scratch.width !== w * SCRATCH_RES ||
    scratch.height !== h * SCRATCH_RES ||
    scratchOf?.floor !== floor ||
    scratchOf.white !== white
  ) {
    scratch.width = w * SCRATCH_RES;
    scratch.height = h * SCRATCH_RES;
    const sctx = scratch.getContext("2d")!;
    sctx.setTransform(
      SCRATCH_RES,
      0,
      0,
      SCRATCH_RES,
      -(BTN_X - PAD) * SCRATCH_RES,
      -(top - PAD) * SCRATCH_RES,
    );
    drawUpgradeButtonSpotlight(sctx, floor, isGroundFloor, white);
    scratchOf = { floor, white };
  }
  const mid = BTN_X + BTN_W / 2;
  for (let x = 0; x < w; x += SLICE) {
    const u = (BTN_X - PAD + x + SLICE / 2 - mid) / (BTN_W / 2 + PAD);
    const bell = Math.abs(u) < 1 ? Math.cos((Math.PI / 2) * u) ** 2 : 0;
    // each slice overlaps the next a touch so no seams show between them
    ctx.drawImage(
      scratch,
      x * SCRATCH_RES,
      0,
      SLICE * SCRATCH_RES,
      h * SCRATCH_RES,
      BTN_X - PAD + x,
      top - PAD + depth * bell,
      SLICE + 0.6,
      h,
    );
  }
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.burrowEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { fallMs, pushMs, holdMs, mergeMs } = CONFIG.burrowEvent;
      const { isGroundFloor } = context;
      const top = getBtnY(isGroundFloor);
      const center = { x: BTN_X + BTN_W / 2, y: top + BTN_H / 2 };
      const blowAt = fallMs + pushMs;
      // how deep the dip is ms in, before it blows
      const dip = (ms: number) =>
        ms < fallMs ? 0 : DEPTH * clamp01((ms - fallMs) / pushMs) ** 1.6;
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blowAt) return null;
        if (ms < fallMs) {
          const u = (ms / fallMs) ** 2;
          const fromY = area.top - START_ABOVE;
          return { x: center.x, y: fromY + (top - fromY) * u };
        }
        const shake = TREMBLE * (dip(ms) / DEPTH);
        return {
          x: center.x + Math.sin(ms / 9) * shake,
          y: top + dip(ms),
        };
      };
      const startedAt = performance.now();
      let landedAt: number | null = null;
      let blewAt: number | null = null;
      scratchOf = null;

      setUpgradeButtonSpotlights([floor]);
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blowAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          onEnd: clearUpgradeButtonSpotlights,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (landedAt === null && ms >= fallMs) land(now);
            if (blewAt === null && ms >= blowAt) blow(now);
            let depth = dip(ms);
            if (blewAt === null) {
              depth += (Math.random() * 2 - 1) * TREMBLE * (depth / DEPTH);
            } else {
              const t = now - blewAt;
              depth =
                -DEPTH *
                SPRING_BACK *
                Math.exp(-t / SPRING_MS) *
                Math.cos(t / 40);
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawBentButton(
              ctx,
              floor,
              isGroundFloor,
              depth,
              blewAt === null ? 0 : Math.max(0, 1 - (now - blewAt) / FLASH_MS),
            );
            if (landedAt !== null && blewAt === null)
              drawWhiteBurst(
                ctx,
                center.x,
                top,
                (now - landedAt) / LAND_BURST_MS,
                LAND_BURST,
              );
            if (blewAt !== null)
              drawExplosion(
                ctx,
                center.x,
                center.y,
                now - blewAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              WISP_SIZE,
              ms < fallMs ? 0.5 : 0.5 + 0.5 * (dip(ms) / DEPTH),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) {
        clearUpgradeButtonSpotlights();
        return;
      }

      // the rumble building as it bores in
      for (let i = 0; i < RUMBLES; i++) {
        const u = i / (RUMBLES - 1);
        setTimeout(
          () => {
            if (cover.isLive()) shakeScreen(lerp(RUMBLE_SHAKE, u));
          },
          fallMs + pushMs * (0.15 + 0.8 * u),
        );
      }

      // on the frame it lands on the button
      function land(now: number): void {
        landedAt = now;
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(LAND_SHAKE);
      }
      // on the frame the button blows: money bursts out every way
      function blow(now: number): void {
        blewAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        cover.launchFrom(
          center,
          Array.from({ length: COINS }, (_, i) => {
            const angle = (i / COINS) * Math.PI * 2;
            const r = lerp(COIN_R, Math.random());
            return {
              x: center.x + Math.cos(angle) * r,
              y: center.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Burrow", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Burrow
export function forceBurrowEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
