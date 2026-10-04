// the "Target Wheel" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a wheel of target wisps hangs in the middle
// of the screen and two gun wisps open up on it from either side, every
// round smacking a target on the rim with a pop and kicking the wheel
// round faster, until it's a whirling blur; then it flies apart, its
// targets flung off the rim onto the income bars, each landing a crit tier
// with a jolt, the last in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "targetWheel";
const MAX_BARS = 4;
const VANES = 8;
const RADIUS = 150;
const SHOTS = 18;
const RANGE = 0.42;
const FLIGHT_MS = 110;
const FLASH_MS = 70;
// rad a second the wheel turns at first, and the kick each hit gives it
const SPIN = 1.2;
const KICK = 1.1;
const FLING_MS = 420;
const FLING = 160;
const TARGET = 0.32;
const GUN = 0.45;
const BULLET = WISP_SIZE * 0.25;
const POP_GAP_MS = 40;
const SHOT_SHAKE = 0.15;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Fling {
  vane: number;
  bar: RewardBar | null;
  to: Point;
  lands: number;
}

export const forceTargetWheelEvent = registerWispEvent(
  KEY,
  "Target Wheel",
  () => CONFIG.targetWheelEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.targetWheelEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const hub: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * 0.4,
    };
    const guns: Point[] = [
      { x: hub.x - width * RANGE, y: hub.y + 40 },
      { x: hub.x + width * RANGE, y: hub.y - 40 },
    ];
    // the hits land at fixed times; each steps the wheel's spin up
    const hitTimes: number[] = [];
    let clock = 200;
    for (let k = 0; k < SHOTS; k++) {
      clock += lerp(shotsMs, k / (SHOTS - 1));
      hitTimes.push(clock);
    }
    const breaks = clock + 120;
    const turned = (ms: number) => {
      let a = 0;
      let at = 0;
      let speed = SPIN;
      for (const h of hitTimes) {
        if (ms <= h) break;
        a += speed * ((h - at) / 1000);
        at = h;
        speed += KICK;
      }
      return a + speed * ((Math.min(ms, breaks) - at) / 1000);
    };
    const rimAt = (vane: number, ms: number, into: Point): Point => {
      const a = turned(ms) + (vane / VANES) * Math.PI * 2;
      into.x = hub.x + Math.cos(a) * RADIUS;
      into.y = hub.y + Math.sin(a) * RADIUS;
      return into;
    };
    const shots: Bullet[] = hitTimes.map((ms, k) => {
      const from = guns[k % 2];
      const to = rimAt((k * 3) % VANES, ms, { x: 0, y: 0 });
      const reach = Math.hypot(to.x - from.x, to.y - from.y);
      return aimBullet(from, to, ms - FLIGHT_MS, reach / FLIGHT_MS);
    });
    // flung off the rim, each onto a bar in turn (the spares onto the last)
    const flings: Fling[] = Array.from({ length: VANES }, (_, vane) => {
      const bar = vane < bars.length ? bars[vane] : bars[bars.length - 1];
      return {
        vane,
        bar: vane < bars.length ? bar : null,
        to: bar.center,
        lands: breaks + FLING_MS + vane * 30,
      };
    });
    const hits = flings.filter((f) => f.bar);
    const last = hits[hits.length - 1];
    const endAt = Math.max(...flings.map((f) => f.lands));
    const vaneAts = flings.map((f) => {
      const spot: Point = { x: 0, y: 0 };
      const off = rimAt(f.vane, breaks, { x: 0, y: 0 });
      const out = Math.atan2(off.y - hub.y, off.x - hub.x);
      const bend: Point = {
        x: off.x + Math.cos(out) * FLING,
        y: off.y + Math.sin(out) * FLING,
      };
      const leaves = breaks + f.vane * 30;
      return (ms: number): Point | null => {
        if (ms > f.lands) return null;
        if (ms < leaves) return rimAt(f.vane, ms, spot);
        return bezier(
          off,
          bend,
          f.to,
          easeIn(clamp01((ms - leaves) / FLING_MS)),
          spot,
        );
      };
    });
    const gunAts = guns.map((g) => () => g);

    let pop = -Infinity;
    const hitting = createBeats(
      shots,
      (b) => b.hitAt,
      (b) => {
        if (!cover!.isLive()) return;
        shakeScreen(SHOT_SHAKE);
        if (b.hitAt - pop < POP_GAP_MS) return;
        pop = b.hitAt;
        playBloop();
      },
    );
    const breaking = createBeats(
      [breaks],
      (ms) => ms,
      () => {
        cover!.burst(hub, 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(HIT_SHAKE[0]);
      },
    );
    const landing = createBeats(
      hits,
      (f) => f.lands,
      (f, k) => {
        const bar = f.bar!;
        cover!.tierUp(bar, bar.center);
        if (f === last) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
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
          hitting.tick(ms, now);
          breaking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          if (ms < breaks)
            for (const g of gunAts)
              drawWispHead(ctx, g, ms, now, WISP_SIZE * GUN, 0.7);
          drawBullets(ctx, shots, ms, now, BULLET, true);
          for (const b of shots) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t >= 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, 50);
          }
          for (const at of vaneAts)
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              WISP_SIZE * TARGET,
              0.8,
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
