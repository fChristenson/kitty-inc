// the "Cinematic" event (an experiment beyond the four templates: the frozen
// screen gets the movie treatment): it covers its crit, whose click freezes
// the screen while black letterbox bars slam in over its top and bottom with
// a boom, and the view punches in on the clicked floor's button in hard zoom
// cuts, ever closer and faster, each a bang, a jolt and a ring of coins;
// then it snaps back wide in a white flash and a huge blast and shake that
// sprays cash everywhere, the bars sliding away, and the coins sweep into
// the total-income readout. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, easeOutCubic, lerp } from "../../shared/easing";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "cinematic";
const REWARD = 4;
// each bar BAR of the screen's height; the view zooms to each of ZOOMS on
// the button in turn
const BAR = 0.12;
const ZOOMS = [1.3, 1.6, 2, 2.6];
const OUT_MS = 200;
const BARS_SHAKE = 1.5;
const PUNCH_COINS = 30;
const PUNCH_REACH: [number, number] = [40, 140];
const PUNCH_SHAKE: [number, number] = [1, 2];
const FINAL_COINS = 320;
const FINAL_REACH: [number, number] = [0.08, 0.6];

export const forceCinematicEvent = registerWispEvent(
  KEY,
  "Cinematic",
  () => CONFIG.cinematicEvent.chance,
  (floor, context, area) => {
    const { barsMs, punchGapsMs, punchMs, holdMs, mergeMs } =
      CONFIG.cinematicEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const button = getButtonCenter(context.isGroundFloor);
    const punches: number[] = [];
    let clock = barsMs + 120;
    for (let k = 0; k < ZOOMS.length; k++) {
      punches.push(clock);
      clock += lerp(punchGapsMs, k / (ZOOMS.length - 1));
    }
    const snapAt = clock;
    const bar = height * BAR;
    // the zoom ms in, punching from one level to the next
    const zoomAt = (ms: number) => {
      if (ms >= snapAt) return 1;
      let k = -1;
      while (k + 1 < ZOOMS.length && ms >= punches[k + 1]) k++;
      if (k < 0) return 1;
      const from = k === 0 ? 1 : ZOOMS[k - 1];
      return (
        from +
        (ZOOMS[k] - from) * easeOutCubic(clamp01((ms - punches[k]) / punchMs))
      );
    };

    const slam = createBeats(
      [barsMs * 0.6],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BARS_SHAKE);
      },
    );
    const punching = createBeats(
      punches,
      (ms) => ms + punchMs * 0.5,
      (_, k) => {
        const t = k / (ZOOMS.length - 1);
        cover!.burst(button, 0.6 + 0.6 * t);
        cover!.launchFrom(
          button,
          ringTargets(button, PUNCH_COINS, PUNCH_REACH),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUNCH_SHAKE, t));
      },
    );
    const snap = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        cover!.burst(button, 3);
        cover!.blast(button);
        cover!.launchFrom(
          button,
          clampTargetsY(
            sprayTargets(button, FINAL_COINS, [
              span * FINAL_REACH[0],
              span * FINAL_REACH[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: snapAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          slam.tick(ms, now);
          punching.tick(ms, now);
          snap.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          const zoom = zoomAt(ms);
          if (zoom > 1) {
            // the patch round the button that fills the screen at this zoom
            const m = ctx.getTransform();
            const sx = button.x - (button.x - area.left) / zoom;
            const sy = button.y - (button.y - area.top) / zoom;
            ctx.drawImage(
              ctx.canvas,
              m.a * sx + m.e,
              m.d * sy + m.f,
              (m.a * width) / zoom,
              (m.d * height) / zoom,
              area.left,
              area.top,
              width,
              height,
            );
          }
          const shown =
            ms < snapAt
              ? easeOutBack(clamp01(ms / barsMs))
              : 1 - clamp01((ms - snapAt) / OUT_MS);
          if (shown <= 0) return;
          ctx.save();
          ctx.fillStyle = COLOR.black;
          ctx.fillRect(area.left, area.top, width, bar * shown);
          ctx.fillRect(
            area.left,
            area.bottom - bar * shown,
            width,
            bar * shown,
          );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
