// the "Ferris Wheel" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while cash flies out of the clicked
// floor's button and builds a giant Ferris wheel in the middle of the
// screen, rim and spokes, with glowing wisp cars riding round it; it
// turns, ever faster, and every car that comes over the top lets go with
// a whoosh and swoops down onto an empty spot on a floor in view, where it
// lands with a pop and a jolt as a new worker; then the wheel spins off
// its axle into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "ferrisWheel";
const REWARD = 2;
const MAX_HIRES = 5;
const FORM_MS = 300;
const RIM_COINS = 520;
const SPOKES = 8;
const SPOKE_COINS = 40;
const COIN = 0.45;
// the wheel is RADIUS of the screen's width round, its hub at HUB of the
// way down; it turns at SPIN laps a second, up to SPIN_UP times that
const RADIUS = 0.36;
const HUB = 0.4;
const SPIN = 0.18;
const SPIN_UP = 3;
const CAR = 0.45;
const SWOOP_MS = 380;
const ROLL_LIFT = 60;
const LAND_SHAKE: [number, number] = [0.6, 1.2];

export const forceFerrisWheelEvent = registerWispEvent(
  KEY,
  "Ferris Wheel",
  () => CONFIG.ferrisWheelEvent.chance,
  (floor, context, area) => {
    const { buildMs, gapsMs, spinOffMs, flightMs, holdMs, mergeMs } =
      CONFIG.ferrisWheelEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HUB,
    };
    const radius = (area.right - area.left) * RADIUS;
    let clock: number = buildMs;
    const releases = hires.map((_, k) => {
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      return clock;
    });
    const lastRelease = releases[releases.length - 1];
    const offAt = lastRelease + SWOOP_MS;
    const endAt = offAt + spinOffMs + flightMs;
    // the wheel's turn, speeding up
    const turn = (ms: number) => {
      const t = Math.max(0, ms) / 1000;
      const span = offAt / 1000;
      return Math.PI * 2 * SPIN * (t + ((SPIN_UP - 1) * t * t) / (2 * span));
    };
    const rimAt = (angle: number, ms: number, into: Point) => {
      const a = angle + turn(Math.min(ms, offAt));
      into.x = hub.x + Math.cos(a) * radius;
      into.y = hub.y + Math.sin(a) * radius;
      return into;
    };
    // each car is placed so it comes over the top just as it lets go
    const cars = hires.map((hire, k) => {
      const offset = -Math.PI / 2 - turn(releases[k]);
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const top: Point = { x: hub.x, y: hub.y - radius };
      const ctrl: Point = { x: (top.x + spot.x) / 2, y: top.y - 80 };
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        lands: releases[k] + SWOOP_MS,
        at: (ms: number): Point | null => {
          if (ms < buildMs * 0.6 || ms >= releases[k] + SWOOP_MS) return null;
          if (ms < releases[k]) return rimAt(offset, ms, at);
          return bezier(
            top,
            ctrl,
            spot,
            easeIn((ms - releases[k]) / SWOOP_MS),
            at,
          );
        },
      };
    });

    const paths: CoinPath[] = [];
    const coin = (angle: number, reach: number) => {
      const sent = Math.random() * buildMs * 0.6;
      const leaves = offAt + Math.random() * spinOffMs;
      const spot: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: Point) => {
        const a = angle + turn(Math.min(ms, offAt));
        into.x = hub.x + Math.cos(a) * radius * reach;
        into.y = hub.y + Math.sin(a) * radius * reach;
        return into;
      };
      paths.push((f) => {
        const ms = f * endAt;
        if (ms < sent) return { x: button.x, y: button.y, scale: 0 };
        place(ms, spot);
        if (ms < sent + buildMs * 0.4) {
          const u = easeOut((ms - sent) / (buildMs * 0.4));
          return {
            x: lerp([button.x, spot.x], u),
            y: lerp([button.y, spot.y], u),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: spot.x, y: spot.y, scale: COIN };
        place(leaves, spot);
        lift.x = spot.x;
        lift.y = spot.y - ROLL_LIFT;
        const total = cover?.total() ?? fallback;
        bezier(
          spot,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      });
    };
    for (let i = 0; i < RIM_COINS; i++)
      coin(Math.random() * Math.PI * 2, 1 + (Math.random() - 0.5) * 0.06);
    for (let s = 0; s < SPOKES; s++)
      for (let i = 0; i < SPOKE_COINS; i++)
        coin((s / SPOKES) * Math.PI * 2, (i + 1) / (SPOKE_COINS + 1));

    const letting = createBeats(
      releases,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      cars,
      (c) => c.lands,
      (c, k) => {
        giveHire(c.hire);
        cover!.burst(c.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, cars.length - 1)));
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
          letting.tick(ms, now);
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const c of cars)
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CAR,
              0.7,
              buildMs * 0.6,
              c.lands,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
