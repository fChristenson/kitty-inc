// the "Mushroom Cloud" event (money; free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while a wisp plummets out
// of the sky onto the clicked floor's button and detonates it in a flash, a
// bang and a jolt; the button erupts a broad churning column of cash that
// shoots up the screen and
// billows out at its head into a rolling mushroom cap, cash tumbling over
// and over round it; every income bar the cap rolls up past jolts with a
// whoomp and free levels; it swells and churns ever faster as the screen
// rumbles, then the whole cloud is sucked up into the total in a huge blast
// and shake. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "mushroomCloud";
const REWARD = 2;
const MAX_BARS = 4;
const CAP_COINS = 950;
const STEM_COINS = 800;
const COIN = 0.55;
// the cap's ring is RING px round and its tube TUBE px thick, both growing
// from GROW_FROM of their size; it's seen from TILT above, tumbling ROLL
// turns a second, ROLL_UP times as fast by the end
const RING: [number, number] = [70, 190];
const TUBE: [number, number] = [34, 80];
const TILT = 0.25;
const ROLL = 1.4;
const ROLL_UP = 2.2;
// the cap tops out at PEAK of the way up the screen; the stem is STEM px
// wide, flowing up FLOW times a second
const PEAK = 0.24;
const STEM = 110;
const FLOW = 2.2;
// the wisp falls from SKY px over the screen
const SKY = 60;
const IMPACT_SHAKE = 1.8;
// sucked up top first, the stem's foot SUCK_SPREAD ms after
const SUCK_SPREAD = 300;
const LIFT = 90;
const RUMBLE_MS = 140;
const PASS_SHAKE: [number, number] = [0.8, 1.6];

export const forceMushroomCloudEvent = registerWispEvent(
  KEY,
  "Mushroom Cloud",
  () => CONFIG.mushroomCloudEvent.chance,
  (floor, context, area) => {
    const { fallMs, riseMs, billowMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.mushroomCloudEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const peak = area.top + (area.bottom - area.top) * PEAK;
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
          .filter((b) => b.center.y < button.y + 40 && b.center.y > peak)
          .slice(-MAX_BARS)
      : [];
    // the cloud's own clock starts as the wisp hits the button
    const suckAt = riseMs + billowMs;
    const endAt = fallMs + suckAt + SUCK_SPREAD + flightMs;
    const capY = (ms: number) =>
      lerp([button.y, peak], easeOut(clamp01(ms / riseMs)));
    const grow = (ms: number) => clamp01(ms / riseMs);
    // the roll's angle, quickening as it billows
    const roll = (ms: number) => {
      const t = Math.min(ms, suckAt) / 1000;
      const b = clamp01((ms - riseMs) / billowMs);
      return (
        Math.PI * 2 * ROLL * (t + (ROLL_UP - 1) * b * b * (billowMs / 2000))
      );
    };
    const into: Point = { x: 0, y: 0 };
    const cap = (phi: number, psi: number, ms: number): number => {
      const g = grow(ms);
      const ring = lerp(RING, g);
      const tube = lerp(TUBE, g);
      const spin = psi + roll(ms);
      const across = ring + tube * Math.cos(spin);
      into.x = button.x + across * Math.cos(phi);
      into.y = capY(ms) - tube * Math.sin(spin) + across * TILT * Math.sin(phi);
      return Math.sin(phi);
    };
    const stem = (along: number, side: number, ms: number) => {
      const top = capY(ms);
      const flow = (along + (ms / 1000) * FLOW) % 1;
      const y = lerp([button.y, top], flow);
      const sway = Math.sin(y * 0.03 + ms * 0.01) * 10;
      into.x = button.x + side * STEM * (0.6 + 0.4 * flow) + sway;
      into.y = y;
      return flow;
    };

    const paths: CoinPath[] = [
      ...Array.from({ length: CAP_COINS }, () => {
        const phi = Math.random() * Math.PI * 2;
        const psi = Math.random() * Math.PI * 2;
        cap(phi, psi, suckAt);
        const from: Point = { x: into.x, y: into.y };
        const lifts =
          suckAt + clamp01((from.y - peak + 120) / 360) * SUCK_SPREAD * 0.5;
        return { phi, psi, from, lifts, cap: true, along: 0, side: 0 };
      }),
      ...Array.from({ length: STEM_COINS }, () => {
        const along = Math.random();
        const side = Math.random() * 2 - 1;
        stem(along, side, suckAt);
        const from: Point = { x: into.x, y: into.y };
        const lifts =
          suckAt +
          SUCK_SPREAD *
            (0.5 + 0.5 * clamp01((from.y - peak) / (button.y - peak)));
        return { phi: 0, psi: 0, from, lifts, cap: false, along, side };
      }),
    ].map((c) => {
      const lift: Point = { x: c.from.x, y: c.from.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f: number) => {
        const ms = f * endAt - fallMs;
        if (ms < 0) return { x: button.x, y: button.y, scale: 0 };
        if (ms < c.lifts) {
          const t = Math.min(ms, suckAt);
          if (c.cap) {
            const depth = cap(c.phi, c.psi, t);
            return {
              x: into.x,
              y: into.y,
              scale: COIN * (0.85 + 0.25 * depth) * (0.4 + 0.6 * grow(t)),
            };
          }
          stem(c.along, c.side, t);
          return { x: into.x, y: into.y, scale: COIN * 0.9 };
        }
        const total = cover?.total() ?? fallback;
        bezier(
          c.from,
          lift,
          total,
          easeIn(clamp01((ms - c.lifts) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    // the cap passes y when easeOut(ms / riseMs) reaches its share
    const passes = bars.map((bar) => {
      const share = clamp01((button.y - bar.center.y) / (button.y - peak));
      return { bar, at: fallMs + riseMs * (1 - Math.sqrt(1 - share)) };
    });
    const passing = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        const t = k / Math.max(1, passes.length - 1);
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), button);
        cover!.burst(p.bar.center, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, t));
      },
    );
    const rumbles = Array.from(
      { length: Math.floor(billowMs / RUMBLE_MS) },
      (_, i) => fallMs + riseMs + i * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive())
          shakeScreen(lerp([0.5, 1.3], k / Math.max(1, rumbles.length - 1)));
      },
    );
    const sky: Point = { x: button.x, y: area.top - SKY };
    const falling: Point = { x: button.x, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms < 0 || ms > fallMs) return null;
      falling.y = lerp([sky.y, button.y], easeIn(ms / fallMs));
      return falling;
    };
    const hitting = createBeats(
      [fallMs],
      (ms) => ms,
      () => {
        cover!.burst(button, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(IMPACT_SHAKE);
      },
    );
    const sucking = createBeats(
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
        bars,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          passing.tick(ms, now);
          rumbling.tick(ms, now);
          sucking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, wisp, ms, now, WISP_SIZE, 1, 0, fallMs),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
