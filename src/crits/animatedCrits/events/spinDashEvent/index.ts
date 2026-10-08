// the "Spin Dash" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a wisp curls up on the clicked floor's button and
// revs, spinning on the spot faster and faster as the screen rumbles; then
// it blasts off in a straight-line blur and smashes into an income bar with
// a bang and a big jolt, and the bar jumps a crit tier; it bounces up, revs
// again in mid-air and dashes into the next bar, the revs ever shorter, the
// last smash a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "spinDash";
const MAX_BARS = 3;
// it revs round a REV px circle, then dashes in DASH_MS, rebounding BOUNCE px
const REV = 16;
const DASH_MS = 110;
const BOUNCE = 140;
const SPINNER = 0.55;
const RUMBLE_MS = 70;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceSpinDashEvent = registerWispEvent(
  KEY,
  "Spin Dash",
  () => CONFIG.spinDashEvent.chance,
  (floor, context) => {
    const { revsMs, holdMs, mergeMs } = CONFIG.spinDashEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let spot: Point = button;
    const dashes = bars.map((bar, k) => {
      const revs = clock;
      const dashes = revs + lerp(revsMs, k / Math.max(1, bars.length - 1));
      const hits = dashes + DASH_MS;
      clock = hits + 120;
      const dash = { bar, spot, revs, dashes, hits };
      // it rebounds up off the bar to rev again
      spot = {
        x: bar.center.x + (k % 2 === 0 ? -1 : 1) * BOUNCE,
        y: bar.center.y - BOUNCE,
      };
      return dash;
    });
    const last = dashes[dashes.length - 1];
    const endAt = last.hits;
    const spinnerAt: Point = { x: 0, y: 0 };
    const spinner = (at: number): Point => {
      // the trail samples before the start, where there's no rebound to come from
      const ms = Math.max(0, at);
      let d = dashes[0];
      for (const dash of dashes) if (ms >= dash.revs - 120) d = dash;
      if (ms < d.revs) {
        // rebounding off the last bar up to this rev spot
        const prev = dashes[dashes.indexOf(d) - 1];
        const u = easeOut(clamp01((ms - prev.hits) / 120));
        spinnerAt.x = lerp([prev.bar.center.x, d.spot.x], u);
        spinnerAt.y = lerp([prev.bar.center.y, d.spot.y], u);
        return spinnerAt;
      }
      if (ms < d.dashes) {
        const u = (ms - d.revs) / (d.dashes - d.revs);
        const a = (ms / (40 - 25 * u)) * Math.PI;
        spinnerAt.x = d.spot.x + Math.cos(a) * REV * (1 - u * 0.5);
        spinnerAt.y = d.spot.y + Math.sin(a) * REV * (1 - u * 0.5);
        return spinnerAt;
      }
      const u = easeIn(clamp01((ms - d.dashes) / DASH_MS));
      spinnerAt.x = lerp([d.spot.x, d.bar.center.x], u);
      spinnerAt.y = lerp([d.spot.y, d.bar.center.y], u);
      return spinnerAt;
    };
    let lastRumble = -Infinity;

    const dashing = createBeats(
      dashes,
      (d) => d.dashes,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      dashes,
      (d) => d.hits,
      (d, k) => {
        cover!.tierUp(d.bar, d.spot);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, dashes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          dashing.tick(ms, now);
          hitting.tick(ms, now);
          let revving = false;
          for (const d of dashes)
            if (ms >= d.revs && ms < d.dashes) revving = true;
          if (revving && now - lastRumble > RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(0.35);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              spinner,
              ms,
              now,
              WISP_SIZE * SPINNER,
              1,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
