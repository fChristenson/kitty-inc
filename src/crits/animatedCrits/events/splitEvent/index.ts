// the "Split" event (an experiment beyond the four templates: the frozen
// screen splits open): it covers its crit, whose click freezes the screen
// while a blazing crack zips across its middle with a jolt; the two halves
// of the screen heave apart, light blazing out of the gap and cash gushing
// out of it in bursts as the screen rumbles; then the halves slam back
// together in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import type { Point } from "../../../../shared/wisp";

const KEY = "split";
const REWARD = 4;
// the crack DROP of the screen's height under its middle; the halves part
// GAP of its height each way
const DROP = 0.04;
const GAP = 0.09;
const CRACK = 10;
const GUSHES = 7;
const GUSH_COINS = 34;
const GUSH_REACH: [number, number] = [60, 220];
const RUMBLE_MS = 70;
const RUMBLE = 1.2;
const CRACK_SHAKE = 1.6;

export const forceSplitEvent = registerWispEvent(
  KEY,
  "Split",
  () => CONFIG.splitEvent.chance,
  (floor, context, area) => {
    const { crackMs, openMs, gushMs, slamMs, holdMs, mergeMs } =
      CONFIG.splitEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const y = (area.top + area.bottom) / 2 + height * DROP;
    const gap = height * GAP;
    const mid = { x: (area.left + area.right) / 2, y };
    const openAt = crackMs;
    const slamFrom = openAt + openMs + gushMs;
    const slamAt = slamFrom + slamMs;
    // how far each half has parted, ms in
    const parted = (ms: number) => {
      if (ms < openAt) return 0;
      if (ms < slamFrom)
        return gap * easeOutBack(clamp01((ms - openAt) / openMs));
      return gap * (1 - easeIn(clamp01((ms - slamFrom) / slamMs)));
    };
    const gushes = Array.from(
      { length: GUSHES },
      (_, k) => openAt + openMs * 0.5 + (gushMs * k) / GUSHES,
    );
    const left: Point = { x: area.left, y };
    const right: Point = { x: area.right, y };
    const spark = { x: 0, y };

    let lastRumble = -Infinity;
    const crack = createBeats(
      [crackMs * 0.3, openAt],
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        if (k === 0) playSwoosh();
        else playExplosion();
        shakeScreen(CRACK_SHAKE);
      },
    );
    const gushing = createBeats(
      gushes,
      (ms) => ms,
      () => {
        const at = { x: area.left + width * between([0.15, 0.85]), y };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(
              at,
              GUSH_COINS,
              GUSH_REACH,
              Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2,
              Math.PI * 0.9,
            ),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );
    const slam = createBeats(
      [slamAt],
      (ms) => ms,
      () => cover!.blast(mid),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: slamAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          crack.tick(ms, now);
          gushing.tick(ms, now);
          slam.tick(ms, now);
          if (
            ms > openAt &&
            ms < slamFrom &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(RUMBLE);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= slamAt) return;
          if (ms < openAt) {
            // the crack zipping out from the middle to both edges
            const reach = (width / 2) * clamp01(ms / (crackMs * 0.7));
            drawBeam(
              ctx,
              { x: mid.x - reach, y },
              { x: mid.x + reach, y },
              CRACK,
            );
            return;
          }
          const d = parted(ms);
          if (d > 0.5) {
            // each half copied back over itself, shoved apart
            const m = ctx.getTransform();
            const sx = m.a * area.left + m.e;
            const sw = m.a * width;
            const bottomH = area.bottom - y;
            const topH = y - area.top;
            ctx.drawImage(
              ctx.canvas,
              sx,
              m.d * y + m.f,
              sw,
              m.d * (bottomH - d),
              area.left,
              y + d,
              width,
              bottomH - d,
            );
            ctx.drawImage(
              ctx.canvas,
              sx,
              m.d * (area.top + d) + m.f,
              sw,
              m.d * (topH - d),
              area.left,
              area.top,
              width,
              topH - d,
            );
            ctx.fillStyle = "rgba(10,8,0,0.9)";
            ctx.fillRect(area.left, y - d, width, d * 2);
          }
          drawBeam(ctx, left, right, Math.max(CRACK, d * 2.2));
          for (let i = 0; i < 3; i++) {
            spark.x = area.left + width * Math.random();
            drawBeamFlare(ctx, spark, lerp([10, 26], d / gap), 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
