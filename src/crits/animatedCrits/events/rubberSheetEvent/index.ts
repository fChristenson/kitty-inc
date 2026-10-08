// the "Rubber Sheet" event (experiment: the screen stretches like a rubber
// sheet; cash): it covers its crit, whose click freezes the screen and a
// wisp dives onto the middle of it, grabs hold and hauls it down, the whole
// screen stretching after it like a sheet of rubber, trembling; it lets go
// and the sheet snaps back up past flat, flinging a geyser of cash into the
// total in a huge blast and shake, then wobbles to rest. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation } from "../../../../shared/explosion";
import {
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "rubberSheet";
const REWARD = 4;
const COLS = 24;
const ROWS = 10;
const GRAB = 0.5;
const PULL = 380;
// how wide the pull reaches, as a share of the width
const REACH = 0.6;
const TREMBLE = 8;
// the snap back: how fast it rings and how fast it dies away
const RING_MS = 300;
const DAMP_MS = 200;
const VOID = "rgba(0,0,0,0.88)";
const RING = 40;
const FLING = 360;
const WISP = 0.75;
const GRAB_SHAKE = 0.5;
const FLING_SHAKE = 2.4;

export const forceRubberSheetEvent = registerWispEvent(
  KEY,
  "Rubber Sheet",
  () => CONFIG.rubberSheetEvent.chance,
  (floor, context, area) => {
    const { diveMs, pullMs, holdTautMs, settleMs, holdMs, mergeMs } =
      CONFIG.rubberSheetEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const grab: Point = { x: left + width / 2, y: top + height * GRAB };
    const lets = diveMs + pullMs + holdTautMs;
    // the fling, at the sheet's first overshoot back up
    const flings = lets + RING_MS / 2;
    const endAt = lets + settleMs;
    // how far down the grab point is pulled at ms
    const pullAt = (ms: number) => {
      if (ms < diveMs) return 0;
      if (ms < diveMs + pullMs) return PULL * easeIn((ms - diveMs) / pullMs);
      if (ms < lets) return PULL + Math.sin(ms * 0.08) * TREMBLE;
      const t = ms - lets;
      return (
        PULL * Math.exp(-t / DAMP_MS) * Math.cos((Math.PI * 2 * t) / RING_MS)
      );
    };
    // how much of the pull a spot follows: pinned at the edges, full at the grab
    const pinX = (x: number) =>
      Math.max(0, 1 - ((x - grab.x) / (width * REACH)) ** 2) ** 2;
    const pinY = (y: number) =>
      y < grab.y
        ? (y - top) / (grab.y - top)
        : (area.bottom - y) / (area.bottom - grab.y);
    const gusher = sampleLine(
      (u) => ({
        x: lerp([grab.x, total.x], u),
        y: lerp([grab.y, total.y], easeOut(u)),
      }),
      20,
    );
    const pour: Pour = {
      coinsAlong: 420,
      width: 50,
      streamMs: 450,
      travelMs: 600,
    };
    const riding = riverHead(gusher, pour.travelMs, flings);
    const hand: Point = { x: grab.x, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms >= flings) return riding(ms);
      if (ms < diveMs) {
        hand.y = lerp([top - 60, grab.y], easeIn(clamp01(ms / diveMs)));
        return hand;
      }
      hand.y = grab.y + pullAt(ms);
      return hand;
    };
    const cw = width / COLS;
    const rh = height / ROWS;

    let shot: ScreenCopy | null = null;
    const grabbing = createBeats(
      [diveMs],
      (ms) => ms,
      () => {
        cover!.burst(grab, 0.5);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(GRAB_SHAKE);
      },
    );
    const flinging = createBeats(
      [flings],
      (ms) => ms,
      () => {
        pourLine(cover!, gusher, pour);
        cover!.launchFrom(
          grab,
          clampTargetsY(
            ringTargets(grab, RING, [120, 320]),
            top + 40,
            area.bottom - 40,
          ),
        );
        cover!.burst(grab, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FLING_SHAKE);
      },
    );
    const landing = createBeats(
      [flings + pour.travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: flings + pour.streamMs + pour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          grabbing.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          if (ms < diveMs) return;
          shot ??= copyScreen(ctx);
          const pull = pullAt(ms);
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          // each column stretched down its length, its rows following the pull
          for (let c = 0; c < COLS; c++) {
            const x = left + c * cw;
            const follow = pull * pinX(x + cw / 2);
            for (let r = 0; r < ROWS; r++) {
              const y0 = top + r * rh;
              const y1 = y0 + rh;
              const d0 = y0 + follow * pinY(y0);
              const d1 = y1 + follow * pinY(y1);
              drawScreenPart(
                ctx,
                shot,
                x,
                y0,
                cw,
                rh,
                x,
                d0,
                cw + 0.5,
                d1 - d0 + 0.5,
              );
            }
          }
        },
        drawOver: (ctx, ms, now) => {
          // the copy hides the cover's own burst, so the fling's is drawn on top
          if (ms >= flings && ms < flings + 900)
            drawDetonation(ctx, grab, ms - flings, FLING, now);
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE * WISP,
            1,
            0,
            flings + pour.travelMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
