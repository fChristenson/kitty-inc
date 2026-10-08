// the "Jelly" event (experiment: the frozen screen wobbles like jelly; cash):
// it covers its crit, whose click freezes the screen and the whole frame
// turns to jelly: the clicked floor's button thumps it from inside, again
// and again, harder each time, and the screen squashes flat and springs up
// tall round the button, wobbling as the screen shakes, every thump a bang
// and a spray of cash; on the last it wobbles wildly, sets dead still and
// goes off in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "jelly";
const REWARD = 4;
const BEHIND = "#0B0814";
// each thump squashes it up to SQUASH, wobbling every WOBBLE_MS, dying over DECAY_MS
const SQUASH: [number, number] = [0.14, 0.32];
const WOBBLE_MS = 190;
const DECAY_MS = 260;
const SET_MS = 180;
const THUMP_COINS = 22;
const THUMP_SHAKE: [number, number] = [0.8, 1.6];

export const forceJellyEvent = registerWispEvent(
  KEY,
  "Jelly",
  () => CONFIG.jellyEvent.chance,
  (floor, context, area) => {
    const { thumpsMs, holdMs, mergeMs } = CONFIG.jellyEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const endAt = thumpsMs[thumpsMs.length - 1] + DECAY_MS * 2 + SET_MS;
    const thumps = thumpsMs.map((at, k) => ({
      at,
      squash: lerp(SQUASH, k / Math.max(1, thumpsMs.length - 1)),
    }));
    // how squashed it is, ms in: + flat and wide, - tall and thin
    const squash = (ms: number) => {
      let s = 0;
      for (const thump of thumps) {
        const t = ms - thump.at;
        if (t < 0) break;
        s +=
          thump.squash *
          Math.exp(-t / DECAY_MS) *
          Math.cos((2 * Math.PI * t) / WOBBLE_MS);
      }
      return s * (1 - clamp01((ms - (endAt - SET_MS)) / SET_MS));
    };

    let shot: ScreenCopy | null = null;
    const thumping = createBeats(
      thumps,
      (t) => t.at,
      (_, k) => {
        const t = k / Math.max(1, thumps.length - 1);
        cover!.launchFrom(
          button,
          clampTargetsY(
            sprayTargets(
              button,
              THUMP_COINS,
              [100, 300],
              -Math.PI / 2,
              Math.PI * 1.6,
            ),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(THUMP_SHAKE, t));
      },
    );
    const setting = createBeats(
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
          thumping.tick(ms, now);
          setting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const s = squash(ms);
          const sx = 1 + s;
          const sy = 1 / (1 + s);
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            button.x + (left - button.x) * sx,
            button.y + (top - button.y) * sy,
            width * sx,
            height * sy,
          );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
