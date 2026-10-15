// the "Raise the Roof" event (explosion; free floors): it covers its crit,
// whose click freezes the screen and pulls the view back over the sky while a
// wisp rockets up out of the clicked button and blows the top of the building
// open; new floors slam down out of the sky onto it one by one, quicker each,
// a heavy jolt and blasts at every landing, the last the hardest. The floors
// unlock as the screen goes live again
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { isFloorLocked } from "../../../../shared/detachedJob";
import { copyScreen, type ScreenCopy } from "../../../../shared/screenCopy";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import type { Floor } from "../../../../gameState";
import { FLOOR_H } from "../../../../floors/constants";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { MAX_FLOORS_PER_BUILDING } from "../../../../floors/floorLock";
import { drawPoppingCritText } from "../../../critFlash/critText";
import type { EventProcContext } from "../../eventProcs";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bakeFrameBand, drawZoomedFrame, zoomPoint } from "../../zoomedFrame";

const KEY = "raiseTheRoof";
const ROCKET = WISP_SIZE * 1.8;
const BLOW_BLAST = 260;
const BLOW_SHAKE = 1.6;
const CORNER_BLAST = 120;
const MIDDLE_BLAST = 90;
const LAND_SHAKE = 1.2;
const LAST_BLAST = 300;
const LAST_CORNER_BLAST = 160;
const LAST_SHAKE = 3;
// a falling floor starts this many of its own heights above the screen
const DROP_FROM = 1.2;
const LABEL_FONT = 64;

// how many floors are still left to unlock in the building
function floorsLeft(context: EventProcContext): number {
  const locked = context.floors.find((f) => !f.unlocked);
  if (!context.unlockFloorFree || !locked || isFloorLocked(locked)) return 0;
  return (
    MAX_FLOORS_PER_BUILDING - context.floors.filter((f) => f.unlocked).length
  );
}

export const forceRaiseTheRoofEvent = registerWispEvent(
  KEY,
  "Raise the Roof",
  () => meta.chance,
  (floor, context, area) => {
    const { floors, zoomMs, blowMs, dropMs, landsMs, holdMs, mergeMs } =
      meta.values;
    const count = Math.min(floors, landsMs.length, floorsLeft(context));
    if (count <= 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = (area.left + area.right) / 2;
    const zoom = height / (height + count * FLOOR_H);
    const zoomAt = (ms: number) =>
      lerp([1, zoom], smoothstep(clamp01(ms / zoomMs)));
    const lands = landsMs.slice(0, count);
    const lastAt = lands[count - 1];
    const button = getButtonCenter(context.isGroundFloor);
    const frameTop = (z: number) => area.bottom - height * z;
    // floor k's top once landed, and its spot ms in
    const restTop = (k: number) => frameTop(zoom) - (k + 1) * FLOOR_H * zoom;
    const topAt = (k: number, ms: number) => {
      const u = clamp01((ms - (lands[k] - dropMs)) / dropMs);
      const from = area.top - DROP_FROM * FLOOR_H * zoom;
      return lerp([from, restTop(k)], u * u);
    };
    const floorWidth = width * zoom;
    const floorLeft = middle - floorWidth / 2;
    const scratch: Point = { x: 0, y: 0 };
    const rocket = (ms: number): Point | null => {
      if (ms < 0 || ms > blowMs) return null;
      const z = zoomAt(ms);
      const from = zoomPoint(area, z, button, scratch);
      const u = (ms / blowMs) ** 2;
      return {
        x: lerp([from.x, middle], u),
        y: lerp([from.y, frameTop(z)], u),
      };
    };

    const landedAt: (number | null)[] = lands.map(() => null);
    const beats = createBeats(
      [blowMs, ...lands],
      (ms) => ms,
      (_, i, now) => {
        if (i > 0) landedAt[i - 1] = now;
        if (!cover!.isLive()) return;
        shakeScreen(
          i === 0 ? BLOW_SHAKE : i === count ? LAST_SHAKE : LAND_SHAKE,
        );
        playExplosion();
      },
    );

    let shot: ScreenCopy | null = null;
    let band: { canvas: HTMLCanvasElement; height: number } | null = null;
    const unlock = context.unlockFloorFree!;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => beats.tick(ms, now),
        onEnd: () => {
          for (let k = 0; k < count; k++) {
            const locked: Floor | undefined = context.floors.find(
              (f) => !f.unlocked,
            );
            if (!locked || isFloorLocked(locked)) break;
            unlock(locked);
          }
        },
        drawUnder: (ctx, ms) => {
          shot ??= copyScreen(ctx);
          // the clicked floor's band stands in for every new floor
          band ??= bakeFrameBand(shot, area, 0, FLOOR_H, floorWidth);
          drawZoomedFrame(
            ctx,
            shot,
            area,
            zoomAt(Math.max(0, ms)),
            ms >= zoomMs,
          );
          for (let k = 0; k < count; k++) {
            if (ms < lands[k] - dropMs) continue;
            ctx.drawImage(
              band.canvas,
              floorLeft,
              topAt(k, ms),
              floorWidth,
              FLOOR_H * zoom,
            );
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          drawWisp(ctx, rocket, ms, now, ROCKET, 0.6);
          scratch.x = middle;
          scratch.y = frameTop(zoom);
          drawDetonation(ctx, scratch, ms - blowMs, BLOW_BLAST, now);
          for (let k = 0; k < count; k++) {
            const last = k === count - 1;
            const foot = restTop(k) + FLOOR_H * zoom;
            const dt = ms - lands[k];
            const corner = last ? LAST_CORNER_BLAST : CORNER_BLAST;
            drawDetonation(ctx, { x: floorLeft, y: foot }, dt, corner, now);
            drawDetonation(
              ctx,
              { x: floorLeft + floorWidth, y: foot },
              dt,
              corner,
              now,
            );
            drawDetonation(
              ctx,
              { x: middle, y: last ? restTop(k) : foot },
              dt,
              last ? LAST_BLAST : MIDDLE_BLAST,
              now,
            );
            const at = landedAt[k];
            if (at !== null)
              drawPoppingCritText(
                ctx,
                "+1 Floor",
                middle,
                restTop(k) + (FLOOR_H * zoom) / 2,
                COLOR.heavenlyGold,
                at,
                now,
                { fontSize: LABEL_FONT, strokeWidth: 8 },
              );
          }
        },
      },
    );
    if (!cover) return;
    playSwoosh();
    playBoostEventStream();
  },
  (_, context) => floorsLeft(context) > 0,
);
