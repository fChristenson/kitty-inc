// the "Shatter" event (shatter; cash): it covers its crit, whose click
// freezes the screen while cracks shoot out from the clicked floor's button
// to the screen's edges in hard knocks, each a crack, a jolt and coins
// spurting out of the impact; on the last the whole screen shatters in a
// blinding flash, a huge blast and shake, its shards blowing outward and
// tumbling away under gravity to reveal the game again, and the cash sweeps
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01 } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeamFlare } from "../../../../shared/beam";
import {
  copyPane,
  createPane,
  drawCracks,
  drawPaneFlash,
  drawShards,
  PANE_COPY_EARLY_MS,
  releasePane,
} from "../../../../shared/shatter";

const KEY = "shatter";
const REWARD = 4;
const CRACKS = 9;
const SPURT_COINS = 26;
const SPURT_REACH: [number, number] = [70, 280];
const KNOCK_SHAKE = [0.9, 1.3, 1.7];

export const forceShatterEvent = registerWispEvent(
  KEY,
  "Shatter",
  () => CONFIG.shatterEvent.chance,
  (floor, context, area) => {
    const { knocksMs, fallMs, holdMs, mergeMs } = CONFIG.shatterEvent;
    const impact = getButtonCenter(context.isGroundFloor);
    const pane = createPane(impact, area, { cracks: CRACKS });
    // the knocks before the last each open their share of the cracks
    const knocks = knocksMs;
    const shatterAt = knocks[knocks.length - 1];
    const endAt = shatterAt + fallMs;
    const opened = (i: number) =>
      knocks[Math.floor((i * (knocks.length - 1)) / CRACKS)];

    const knocking = createBeats(
      knocks.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          impact,
          clampTargetsY(
            sprayTargets(
              impact,
              SPURT_COINS,
              SPURT_REACH,
              -Math.PI / 2,
              Math.PI * 2,
            ),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        cover!.burst(impact, 0.7 + 0.2 * k);
        if (!cover!.isLive()) return;
        playSwoosh();
        playExplosion();
        shakeScreen(KNOCK_SHAKE[k] ?? 1.5);
      },
    );
    const shattering = createBeats(
      [shatterAt],
      (ms) => ms,
      () => cover!.blast(impact, 70),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          knocking.tick(ms, now);
          shattering.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            releasePane(pane);
            return;
          }
          if (ms >= shatterAt - PANE_COPY_EARLY_MS) copyPane(ctx, pane);
          if (ms < shatterAt) {
            drawCracks(ctx, pane, ms, opened);
            drawBeamFlare(ctx, impact, 24, 0.8, now);
            return;
          }
          const t = ms - shatterAt;
          // a blinding flash behind the shards, fading back to the game
          drawPaneFlash(ctx, area, 1 - clamp01(t / (fallMs * 0.6)));
          drawShards(
            ctx,
            pane,
            t,
            1 - clamp01((t - fallMs * 0.6) / (fallMs * 0.4)),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
