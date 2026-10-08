// the "Water Pistol" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a wisp dives out of the clicked
// floor's button to the bottom of the screen and drinks: rivers of cash rush
// in from both sides and pour into it as it swells; then it rises and
// squirts jets of cash at every worker in view, one after another, each
// soaking its worker with a splash, a bloop and a jolt as they climb a perma
// tier; the last lands in a huge blast and shake and the coins sweep into
// the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "waterPistol";
const REWARD = 2;
const MAX_WORKERS = 6;
const BOTTOM = 110;
const EDGE = 20;
const RISE_MS = 250;
const ARC = 80;
const PISTOL: [number, number] = [0.5, 0.9];
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceWaterPistolEvent = registerWispEvent(
  KEY,
  "Water Pistol",
  () => CONFIG.waterPistolEvent.chance,
  (floor, context, area) => {
    const { diveMs, drinkMs, gapsMs, squirtMs, holdMs, mergeMs } =
      CONFIG.waterPistolEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const well: Point = { x: cx, y: area.bottom - BOTTOM };
    const aim: Point = { x: cx, y: (area.top + area.bottom) / 2 + 60 };
    const sips = [area.left + EDGE, area.right - EDGE].map((x) =>
      sampleLine(
        (u) => ({
          x: lerp([x, well.x], u),
          y: well.y + Math.sin(u * Math.PI) * 30,
        }),
        30,
      ),
    );
    const sip: Pour = {
      coinsAlong: 700,
      width: 34,
      streamMs: drinkMs,
      travelMs: drinkMs * 0.6,
    };
    const squirt: Pour = {
      coinsAlong: 500,
      width: 22,
      streamMs: 220,
      travelMs: squirtMs,
    };
    const aimAt = diveMs + drinkMs + RISE_MS;
    let clock = aimAt;
    const jets = workers.map((worker, k) => {
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const ctrl: Point = {
        x: (aim.x + worker.at.x) / 2,
        y: Math.min(aim.y, worker.at.y) - ARC,
      };
      const line = sampleLine(
        (u) => bezier(aim, ctrl, worker.at, u, { x: 0, y: 0 }),
        30,
      );
      return { worker, line, starts, lands: starts + squirtMs };
    });
    const last = jets[jets.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.starts, squirt),
      pourDurationMs(diveMs, sip),
      endAt + holdMs + mergeMs,
    );
    const pistolAt: Point = { x: 0, y: 0 };
    const pistol = (ms: number): Point => {
      if (ms < diveMs) {
        const u = easeOut(ms / diveMs);
        pistolAt.x = lerp([button.x, well.x], u);
        pistolAt.y = lerp([button.y, well.y], u);
      } else {
        const u = smoothstep(clamp01((ms - diveMs - drinkMs) / RISE_MS));
        pistolAt.x = well.x;
        pistolAt.y = lerp([well.y, aim.y], u);
      }
      return pistolAt;
    };

    const drinking = createBeats(
      [diveMs],
      (ms) => ms,
      () => {
        for (const line of sips) pourLine(cover!, line, sip);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const squirting = createBeats(
      jets,
      (j) => j.starts,
      (j) => pourLine(cover!, j.line, squirt),
    );
    const soaking = createBeats(
      jets,
      (j) => j.lands,
      (j, k) => {
        cover!.promote(j.worker);
        if (j === last) {
          cover!.blast(j.worker.at);
          return;
        }
        cover!.burst(j.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
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
        workers,
        tick: (ms, now) => {
          drinking.tick(ms, now);
          squirting.tick(ms, now);
          soaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > last.starts + 200) return;
          const swell = lerp(PISTOL, clamp01((ms - diveMs) / drinkMs));
          drawWispBetween(
            ctx,
            pistol,
            ms,
            now,
            WISP_SIZE * swell,
            swell,
            0,
            last.starts + 200,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
