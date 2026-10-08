// the "Pool Dive" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a river of cash pours out of the
// clicked floor's button into a churning pool at the bottom of the screen;
// a wisp swan-dives in from the top with a huge splash, then bursts out
// again riding a jet of cash to an empty spot, where a worker forms with a
// bang and a jolt; it dives back in and rockets out to the next, quicker
// each time, the last landing in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "poolDive";
const REWARD = 2;
const MAX_HIRES = 5;
const FORM_MS = 300;
const POOL_UP = 70;
const ARC = 240;
const LIFT = 20;
const SPLASH = 26;
const WISP = 0.55;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forcePoolDiveEvent = registerWispEvent(
  KEY,
  "Pool Dive",
  () => CONFIG.poolDiveEvent.chance,
  (floor, context, area) => {
    const { fillMs, diveMs, jetsMs, holdMs, mergeMs } = CONFIG.poolDiveEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const pool: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - POOL_UP,
    };
    const fill = sampleLine(
      (u) =>
        bezier(button, { x: pool.x, y: button.y - 120 }, pool, u, {
          x: 0,
          y: 0,
        }),
      30,
    );
    const fillPour: Pour = {
      coinsAlong: 260,
      width: 50,
      streamMs: fillMs,
      travelMs: fillMs * 0.7,
    };
    const dives = fillMs * 0.7;
    const splashAt = dives + diveMs;
    let clock = splashAt;
    const jets = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const travelMs = lerp(jetsMs, k / Math.max(1, hires.length - 1));
      const line = sampleLine(
        (u): Point => ({
          x: lerp([pool.x, spot.x], u),
          y: lerp([pool.y, spot.y], u) - Math.sin(Math.PI * u) * ARC,
        }),
        30,
      );
      const starts = clock;
      clock += travelMs;
      return {
        hire,
        spot,
        line,
        starts,
        lands: starts + travelMs,
        head: riverHead(line, travelMs, starts),
        pour: {
          coinsAlong: 180,
          width: 30,
          streamMs: travelMs * 0.6,
          travelMs,
        } as Pour,
      };
    });
    const last = jets[jets.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      ...jets.map((j) => pourDurationMs(j.starts, j.pour)),
      endAt + holdMs + mergeMs,
    );
    const diverAt: Point = { x: 0, y: 0 };
    const diver = (ms: number): Point | null => {
      if (ms < splashAt) {
        const u = easeIn(clamp01((ms - dives) / diveMs));
        diverAt.x = pool.x;
        diverAt.y = lerp([area.top, pool.y], u);
        return diverAt;
      }
      for (const j of jets) {
        if (ms > j.lands) continue;
        return j.head(Math.max(ms, j.starts));
      }
      return null;
    };

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, fill, fillPour),
    );
    const splashing = createBeats(
      [splashAt],
      (ms) => ms,
      () => {
        cover!.burst(pool, 0.8);
        cover!.launchFrom(
          pool,
          clampTargetsY(
            sprayTargets(pool, SPLASH, [80, 300], -Math.PI / 2, Math.PI * 0.8),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const jetting = createBeats(
      jets,
      (j) => j.starts,
      (j) => pourLine(cover!, j.line, j.pour),
    );
    const landing = createBeats(
      jets,
      (j) => j.lands,
      (j, k) => {
        giveHire(j.hire);
        if (j === last) {
          cover!.blast(j.spot);
          return;
        }
        cover!.burst(j.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, jets.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          splashing.tick(ms, now);
          jetting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            diver,
            ms,
            now,
            WISP_SIZE * WISP,
            0.7,
            dives,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
