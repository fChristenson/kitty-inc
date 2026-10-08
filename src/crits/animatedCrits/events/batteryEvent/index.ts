// the "Battery" event (beam; free upgrade levels): it covers its crit, whose
// click freezes the screen while the income bars in view turn into a gun
// battery: an aim laser flickers out of one end of a bar and a blazing beam
// fires off it to the screen's edge, the bar kicking back in a flash, a bang
// and a jolt that lands free levels; bar after bar, side after side, ever
// faster, then every bar fires both ways at once in a blinding volley and
// slams in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "battery";
const MAX_BARS = 4;
const MIN_SHOTS = 6;
// each beam climbs ANGLE (radians) off level, BEAM px across as it fires
const ANGLE: [number, number] = [0.1, 0.45];
const BEAM = 42;
const MUZZLE = 30;
const SHOT_SHAKE: [number, number] = [0.8, 1.6];
const SHOT_BURST: [number, number] = [0.45, 0.75];

type Gun = { bar: RewardBar; muzzle: Point; edge: Point };

export const forceBatteryEvent = registerWispEvent(
  KEY,
  "Battery",
  () => CONFIG.batteryEvent.chance,
  (floor, context, area) => {
    const { gapsMs, aimMs, fireMs, volleyMs, levelShare, holdMs, mergeMs } =
      CONFIG.batteryEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const gun = (bar: RewardBar, side: number): Gun => {
      const muzzle = {
        x: side > 0 ? bar.box.x + bar.box.width : bar.box.x,
        y: bar.center.y,
      };
      const x = side > 0 ? area.right + 40 : area.left - 40;
      const climb = Math.tan(lerp(ANGLE, Math.random()));
      return {
        bar,
        muzzle,
        edge: {
          x,
          y: Math.max(area.top - 40, muzzle.y - Math.abs(x - muzzle.x) * climb),
        },
      };
    };
    const count = Math.max(MIN_SHOTS, bars.length * 2);
    const shots = Array.from({ length: count }, (_, k) =>
      gun(
        bars[k % bars.length],
        (k + Math.floor(k / bars.length)) % 2 === 0 ? 1 : -1,
      ),
    );
    const volley = bars.flatMap((bar) => [gun(bar, 1), gun(bar, -1)]);
    const fires: number[] = [];
    let clock = aimMs;
    shots.forEach((_, k) => {
      fires.push(clock);
      clock += lerp(gapsMs, k / (count - 1));
    });
    const volleyAt = fires[count - 1] + fireMs + aimMs;
    const blastAt = volleyAt + volleyMs;

    const firing = createBeats(
      shots,
      (_, k) => fires[k],
      (shot, k) => {
        const t = k / (count - 1);
        cover!.levels(
          shot.bar,
          levelsFor(shot.bar.floor, levelShare, 1),
          shot.edge,
        );
        cover!.burst(shot.muzzle, lerp(SHOT_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOT_SHAKE, t));
      },
    );
    const volleying = createBeats(
      [volleyAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2);
      },
    );
    const finale = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        for (const bar of bars)
          cover!.levels(bar, levelsFor(bar.floor, levelShare, 1));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          volleying.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= blastAt) return;
          if (ms >= volleyAt - aimMs) {
            if (ms < volleyAt) {
              for (const g of volley) drawAimLaser(ctx, g.muzzle, g.edge);
              return;
            }
            const swell = 0.7 + 0.5 * clamp01((ms - volleyAt) / volleyMs);
            for (const g of volley) {
              drawBeam(ctx, g.muzzle, g.edge, BEAM * swell);
              drawBeamFlare(ctx, g.muzzle, MUZZLE * swell, 1, now);
            }
            return;
          }
          shots.forEach((shot, k) => {
            const since = ms - fires[k];
            if (since < -aimMs || since >= fireMs) return;
            if (since < 0) {
              drawAimLaser(ctx, shot.muzzle, shot.edge);
              return;
            }
            const u = since / fireMs;
            drawBeam(
              ctx,
              shot.muzzle,
              shot.edge,
              BEAM * (1 - 0.6 * u),
              1 - u * u,
            );
            drawBeamFlare(ctx, shot.muzzle, MUZZLE * (1 - u), 1 - u, now);
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
