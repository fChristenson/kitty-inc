// the "Gyroscope" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while three rings of wisps fly out of the clicked
// floor's button and spin up round the screen's middle like a gyroscope,
// each ring tilted its own way and turning, ever faster, as the screen
// hums; then ring after ring breaks loose and collapses onto an income bar,
// which blazes with a flash and a jolt and jumps a crit tier; the last
// slams down in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "gyroscope";
const RINGS = 3;
const PER_RING = 4;
// rings RADIUS of the screen's smaller side out, squashed SQUASH; each
// tilted TILT apart and turning, spinning SPIN laps a second at most
const RADIUS = 0.28;
const SQUASH = 0.35;
const TILT = Math.PI / 3;
const SPIN = 2.2;
const COLLAPSE_MS = 260;
const RIDER = 0.3;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceGyroscopeEvent = registerWispEvent(
  KEY,
  "Gyroscope",
  () => CONFIG.gyroscopeEvent.chance,
  (floor, context, area) => {
    const { spinMs, gapsMs, holdMs, mergeMs } = CONFIG.gyroscopeEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, RINGS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius =
      Math.min(area.right - area.left, area.bottom - area.top) * RADIUS;
    let clock: number = spinMs;
    const rings = bars.map((bar, k) => {
      const breaks = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      return { bar, k, breaks, lands: breaks + COLLAPSE_MS };
    });
    const last = rings[rings.length - 1];
    const endAt = last.lands;
    const orbit = (k: number, i: number, ms: number, into: Point) => {
      const spin =
        SPIN * Math.PI * 2 * (ms / 1000) * clamp01(0.3 + ms / spinMs);
      const a = (i / PER_RING) * Math.PI * 2 + spin * (k % 2 === 0 ? 1 : -1);
      const tilt = k * TILT + ms * 0.0004 * (k + 1);
      const ex = Math.cos(a) * radius;
      const ey = Math.sin(a) * radius * SQUASH;
      const grow = easeOut(clamp01(ms / 400));
      into.x = center.x + (ex * Math.cos(tilt) - ey * Math.sin(tilt)) * grow;
      into.y = center.y + (ex * Math.sin(tilt) + ey * Math.cos(tilt)) * grow;
      if (ms < 400) {
        into.x = lerp([button.x, into.x], grow);
        into.y = lerp([button.y, into.y], grow);
      }
      return into;
    };
    const riders = rings.flatMap((ring) =>
      Array.from({ length: PER_RING }, (_, i) => {
        const at: Point = { x: 0, y: 0 };
        const from: Point = { x: 0, y: 0 };
        orbit(ring.k, i, ring.breaks, from);
        return {
          lands: ring.lands,
          at: (ms: number): Point | null => {
            if (ms >= ring.lands) return null;
            if (ms < ring.breaks) return orbit(ring.k, i, ms, at);
            const u = easeIn((ms - ring.breaks) / COLLAPSE_MS);
            at.x = lerp([from.x, ring.bar.center.x], u);
            at.y = lerp([from.y, ring.bar.center.y], u);
            return at;
          },
        };
      }),
    );

    const humming = createBeats(
      [spinMs * 0.4, spinMs * 0.75],
      (ms) => ms,
      (_, j) => {
        if (cover?.isLive()) shakeScreen(0.3 + 0.3 * j);
      },
    );
    const landing = createBeats(
      rings,
      (r) => r.lands,
      (r, k) => {
        cover!.tierUp(r.bar, center);
        if (r === last) {
          cover!.slam(r.bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rings.length - 1)));
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
          humming.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const r of riders)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * RIDER,
              0.5,
              0,
              r.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
