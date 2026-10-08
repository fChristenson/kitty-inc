// the "Echo" event (experiment: the frozen screen echoes; cash): it covers
// its crit, whose click freezes the screen and on every beat the screen
// booms: a ghost copy of the whole frame swells out of the clicked floor's
// button and fades away like a sound echo, the screen thumping with it, a
// jolt and a burst of coins; the booms come faster and the echoes pile up
// in rings; then every echo comes rushing back in and collapses into the
// button in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "echo";
const REWARD = 4;
const BOOMS = 7;
const ECHO_MS = 520;
const ECHO_GROW = 0.7;
const ECHO_ALPHA = 0.55;
const THUMP = 0.05;
const THUMP_MS = 140;
const COLLAPSE_FROM = 1.9;
const COINS = 14;
const COIN_REACH: [number, number] = [70, 260];
const BOOM_SHAKE: [number, number] = [0.5, 1.3];

export const forceEchoEvent = registerWispEvent(
  KEY,
  "Echo",
  () => CONFIG.echoEvent.chance,
  (floor, context, area) => {
    const { boomsMs, collapseMs, holdMs, mergeMs } = CONFIG.echoEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const booms: number[] = [];
    let clock = 80;
    for (let k = 0; k < BOOMS; k++) {
      booms.push(clock);
      clock += lerp(boomsMs, k / (BOOMS - 1));
    }
    const collapseAt = clock;
    const endAt = collapseAt + collapseMs;
    // the frame scaled by `s` round the button
    const drawScaled = (
      ctx: CanvasRenderingContext2D,
      shot: ScreenCopy,
      s: number,
    ) =>
      drawScreenPart(
        ctx,
        shot,
        left,
        top,
        width,
        height,
        button.x + (left - button.x) * s,
        button.y + (top - button.y) * s,
        width * s,
        height * s,
      );

    let shot: ScreenCopy | null = null;
    const booming = createBeats(
      booms,
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          button,
          clampTargetsY(
            ringTargets(button, COINS, COIN_REACH),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / (BOOMS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(button),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.clip();
          let thump = 1;
          for (const b of booms) {
            const t = (ms - b) / THUMP_MS;
            if (t > 0 && t < 1) thump = 1 + THUMP * Math.sin(Math.PI * t);
          }
          drawScaled(ctx, shot, thump);
          if (ms < collapseAt) {
            for (const b of booms) {
              const t = (ms - b) / ECHO_MS;
              if (t <= 0 || t >= 1) continue;
              ctx.globalAlpha = ECHO_ALPHA * (1 - t);
              drawScaled(ctx, shot, 1 + ECHO_GROW * easeOut(t));
            }
          } else {
            // every echo rushing back in on the button
            const u = easeIn(clamp01((ms - collapseAt) / collapseMs));
            for (let k = 0; k < 3; k++) {
              ctx.globalAlpha = ECHO_ALPHA * u;
              drawScaled(ctx, shot, lerp([COLLAPSE_FROM - k * 0.25, 1], u));
            }
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
