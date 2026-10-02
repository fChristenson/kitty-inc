// the "Smash and Grab" event (shatter; cash): it covers its crit, whose
// click freezes the screen while the clicked floor's button smashes into the
// glass of the screen from behind, knock after knock, cracks racing out with
// coins spilling from the impact; on the last the screen shatters and its
// shards are snatched up one after another, the nearest first, each flying
// into the total-income readout with a flash and a bloop, until the last goes
// in with a huge blast and shake, and the cash sweeps into the total. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawBeamFlare } from "../../shared/beam";
import {
  copyPane,
  createPane,
  drawCracks,
  drawPaneFlash,
  drawShards,
  PANE_COPY_EARLY_MS,
  releasePane,
  type Shard,
} from "../../shared/shatter";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "smashAndGrab";
const REWARD = 4;
const CRACKS = 8;
const SPILL_COINS = 14;
const KNOCK_SHAKE: [number, number] = [0.8, 1.5];
const GONE = 1e6;

export const forceSmashAndGrabEvent = registerWispEvent(
  KEY,
  "Smash and Grab",
  () => CONFIG.smashAndGrabEvent.chance,
  (floor, context, area) => {
    const { knocksMs, grabMs, flyMs, holdMs, mergeMs } =
      CONFIG.smashAndGrabEvent;
    const fallback = totalSpot(area);
    const impact = getButtonCenter(context.isGroundFloor);
    const pane = createPane(impact, area, {
      cracks: CRACKS,
      rings: [160, 400],
    });
    const knocks = knocksMs;
    const shatterAt = knocks[knocks.length - 1];
    const opened = (i: number) =>
      knocks[Math.floor((i * (knocks.length - 1)) / CRACKS)];
    // each shard is grabbed in turn, nearest the impact first
    const far = Math.max(
      ...pane.shards.map((s) =>
        Math.hypot(s.centre.x - impact.x, s.centre.y - impact.y),
      ),
    );
    const grabs = new Map<Shard, number>(
      pane.shards.map((s) => [
        s,
        (Math.hypot(s.centre.x - impact.x, s.centre.y - impact.y) / far) *
          grabMs,
      ]),
    );
    const landings = pane.shards.map((s) => shatterAt + grabs.get(s)! + flyMs);
    const endAt = Math.max(...landings);
    const snatch = (shard: Shard, t: number, into: Point) => {
      const raw = (t - grabs.get(shard)!) / flyMs;
      // gone once it's in the total
      if (raw >= 1) {
        into.x = GONE;
        into.y = GONE;
        return;
      }
      const u = easeIn(clamp01(raw));
      const total = cover?.total() ?? fallback;
      into.x = (total.x - shard.centre.x) * u;
      into.y = (total.y - shard.centre.y) * u - Math.sin(Math.PI * u) * 120;
    };

    const knocking = createBeats(
      knocks,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, knocks.length - 1);
        cover!.burst(impact, 0.6 + 0.5 * t);
        if (k < knocks.length - 1)
          cover!.launchFrom(
            impact,
            clampTargetsY(
              sprayTargets(
                impact,
                SPILL_COINS,
                [60, 220],
                -Math.PI / 2,
                Math.PI * 2,
              ),
              area.top + 40,
              area.bottom - 20,
            ),
          );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(KNOCK_SHAKE, t) + (k === knocks.length - 1 ? 0.7 : 0));
      },
    );
    const landing = createBeats(
      landings.filter((at) => at < endAt),
      (ms) => ms,
      () => {
        cover!.burst(cover!.total() ?? fallback, 0.4);
        if (cover!.isLive()) playBloop();
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
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
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            releasePane(pane);
            return;
          }
          if (ms >= shatterAt - PANE_COPY_EARLY_MS) copyPane(ctx, pane);
          if (ms < shatterAt) {
            drawCracks(ctx, pane, ms, opened);
            drawBeamFlare(ctx, impact, 22, 0.9, now);
            return;
          }
          const t = ms - shatterAt;
          drawPaneFlash(ctx, area, 0.8 * (1 - clamp01(t / 250)));
          drawShards(ctx, pane, t, 1, snatch);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
