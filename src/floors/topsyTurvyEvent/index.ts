// the "Topsy-Turvy" event (bounce; free hires): it covers its crit, whose
// click freezes the screen while balls of light pop out of the clicked
// floor's button and bounce off along the bottom of the screen, one to a
// column over each empty spot; then gravity flips: every ball falls UP,
// smashes into the top of the screen all at once with a bang and a jolt and
// bounces along it; it flips again and again, quicker each time, until the
// last flip drops every ball straight down onto its empty spot, each
// landing as a new worker, the last in a huge blast. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawBounceSplash, type Bounce } from "../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "topsyTurvy";
const MAX_HIRES = 4;
// px the bouncing floor sits above the screen's bottom, and the ceiling
// below its top (clear of the total readout)
const FLOOR_IN = 70;
const CEILING_IN = 190;
// gravity flips this many times before the last one drops them home
const FLIPS = 3;
const HOPS = 2;
// a hop's height, and how far it drifts sideways and back
const LAUNCH_LIFT = 260;
const HOP_LIFT: [number, number] = [130, 60];
const HOP_DRIFT = 50;
// px each ball lands over its spot
const ABOVE = 40;
const BALL = WISP_SIZE * 0.8;
const SPLASH = 90;
const SURFACE_W = 8;
const SURFACE_ALPHA: [number, number] = [0.12, 0.45];
const SURFACE_FLASH_MS = 220;
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;
const LAUNCH_SHAKE = 0.6;
const FLIP_SHAKE = 0.4;
const SLAM_SHAKE: [number, number] = [0.9, 1.5];
const HOP_SHAKE = 0.25;
const HIRE_SHAKE = 1.2;

interface Leg {
  from: Point;
  to: Point;
  starts: number;
  ends: number;
  // arcs bow `lift` px off the surface (signed); falls speed up from rest
  lift: number;
  fall: boolean;
}

interface Ball {
  hire: RewardHire;
  legs: Leg[];
  contacts: Bounce[];
  launches: number;
  lands: number;
  spot: Point;
}

export const forceTopsyTurvyEvent = registerWispEvent(
  KEY,
  "Topsy-Turvy",
  () => CONFIG.topsyTurvyEvent.chance,
  (floor, context, area) => {
    const { launchMs, staggerMs, firstHopsMs, fallMs, hopsMs, dropMs } =
      CONFIG.topsyTurvyEvent;
    const { holdMs, mergeMs } = CONFIG.topsyTurvyEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const floorY = area.bottom - FLOOR_IN;
    const ceilingY = area.top + CEILING_IN;
    const span = floorY - ceilingY;
    // every flip and every slam into the far side lands on the same beat
    const flips: number[] = [];
    const slams: number[] = [];
    let clock: number = launchMs + (hires.length - 1) * staggerMs + firstHopsMs;
    for (let j = 0; j < FLIPS; j++) {
      const t = j / Math.max(1, FLIPS - 1);
      flips.push(clock);
      clock += lerp(fallMs, t);
      slams.push(clock);
      clock += lerp(hopsMs, t);
    }
    const dropsAt = clock;
    const hopLift = (j: number) => lerp(HOP_LIFT, j / FLIPS);
    const balls: Ball[] = hires.map((hire, k) => {
      const legs: Leg[] = [];
      const contacts: Bounce[] = [];
      const x = hire.x;
      const add = (leg: Leg, normal: number) => {
        legs.push(leg);
        contacts.push({ at: leg.to, ms: leg.ends, normal });
      };
      // hops along a surface from `at`, out and back, filling [from, to]
      const hopAlong = (
        y: number,
        from: number,
        to: number,
        lift: number,
        normal: number,
      ) => {
        const each = (to - from) / HOPS;
        for (let h = 0; h < HOPS; h++) {
          const out = h % 2 === 0;
          add(
            {
              from: { x: out ? x : x + HOP_DRIFT, y },
              to: { x: out ? x + HOP_DRIFT : x, y },
              starts: from + h * each,
              ends: from + (h + 1) * each,
              lift: lift * (1 - 0.35 * h),
              fall: false,
            },
            normal,
          );
        }
      };
      const launches = k * staggerMs;
      add(
        {
          from: button,
          to: { x, y: floorY },
          starts: launches,
          ends: launches + launchMs,
          lift: LAUNCH_LIFT,
          fall: false,
        },
        UP,
      );
      hopAlong(floorY, launches + launchMs, flips[0], hopLift(0), UP);
      for (let j = 0; j < FLIPS; j++) {
        const upward = j % 2 === 0;
        const from = upward ? floorY : ceilingY;
        const to = upward ? ceilingY : floorY;
        add(
          {
            from: { x, y: from },
            to: { x, y: to },
            starts: flips[j],
            ends: slams[j],
            lift: 0,
            fall: true,
          },
          upward ? DOWN : UP,
        );
        const end = j + 1 < FLIPS ? flips[j + 1] : dropsAt;
        // off the ceiling the hops bow down
        hopAlong(
          to,
          slams[j],
          end,
          hopLift(j + 1) * (upward ? -1 : 1),
          upward ? DOWN : UP,
        );
      }
      // the last flip: from wherever it is, straight down onto its spot
      const last = legs[legs.length - 1].to;
      const home: Point = { x, y: hire.y - ABOVE };
      const lands =
        dropsAt + dropMs * Math.sqrt(Math.abs(home.y - last.y) / span);
      add(
        {
          from: last,
          to: home,
          starts: dropsAt,
          ends: lands,
          lift: 0,
          fall: true,
        },
        UP,
      );
      return { hire, legs, contacts, launches, lands, spot: { x: 0, y: 0 } };
    });
    const ats = balls.map((ball) => (ms: number): Point | null => {
      if (ms > ball.lands) return null;
      const { legs, spot } = ball;
      let k = 0;
      while (k < legs.length - 1 && ms >= legs[k].ends) k++;
      const leg = legs[k];
      const raw = clamp01((ms - leg.starts) / (leg.ends - leg.starts || 1));
      const u = leg.fall ? easeIn(raw) : raw;
      spot.x = lerp([leg.from.x, leg.to.x], u);
      spot.y = lerp([leg.from.y, leg.to.y], u) - 4 * leg.lift * raw * (1 - raw);
      return spot;
    });
    const last = balls.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;
    // the hop landings all balls share once they bounce in step
    const hopBeats = balls[0].contacts
      .filter((c) => c.ms > flips[0] && c.ms < dropsAt && !slams.includes(c.ms))
      .map((c) => c.ms);
    const left: Point = { x: area.left, y: 0 };
    const right: Point = { x: area.right, y: 0 };

    const launching = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.6);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const flipping = createBeats(
      flips,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FLIP_SHAKE);
      },
    );
    const slamming = createBeats(
      slams,
      (ms) => ms,
      (_, j) => {
        for (const ball of balls) {
          const c = ball.contacts.find((b) => b.ms === slams[j]);
          if (c) cover!.burst(c.at, 0.4);
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, j / Math.max(1, FLIPS - 1)));
      },
    );
    const hopping = createBeats(
      hopBeats,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(HOP_SHAKE);
      },
    );
    const landing = createBeats(
      balls,
      (b) => b.lands,
      (b) => {
        giveHire(b.hire);
        const home = b.legs[b.legs.length - 1].to;
        if (b === last) {
          cover!.blast(home);
          return;
        }
        cover!.burst(home, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          launching.tick(ms, now);
          flipping.tick(ms, now);
          slamming.tick(ms, now);
          hopping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endAt + 600) return;
          // the floor and the ceiling, whichever is "down" now lit brighter,
          // flashing as gravity flips onto it
          if (ms < dropsAt) {
            let flipped = 0;
            let since = ms;
            for (const at of flips)
              if (ms >= at) {
                flipped++;
                since = ms - at;
              }
            const flash =
              flipped > 0 ? 1 - clamp01(since / SURFACE_FLASH_MS) : 0;
            const downIsFloor = flipped % 2 === 0;
            for (let side = 0; side < 2; side++) {
              const isFloor = side === 0;
              const y = isFloor ? floorY : ceilingY;
              left.y = y;
              right.y = y;
              const lit = isFloor === downIsFloor;
              drawBeam(
                ctx,
                left,
                right,
                SURFACE_W * (lit ? 1 + flash : 1),
                lit ? SURFACE_ALPHA[1] + 0.5 * flash : SURFACE_ALPHA[0],
              );
            }
          }
          for (let k = 0; k < balls.length; k++) {
            const ball = balls[k];
            for (const c of ball.contacts)
              drawBounceSplash(ctx, c, ms - c.ms, SPLASH, now);
            drawWispBetween(
              ctx,
              ats[k],
              ms,
              now,
              BALL,
              0.7,
              ball.launches,
              ball.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
