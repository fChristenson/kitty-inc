// the "Time Trial" event (race; a crit tier): it covers its crit, whose click
// freezes the screen while a small ghost wisp, the lap record, tears in under
// the clicked floor's bar, brakes hard into a hairpin round the outer end of
// its button and powers back along the top; the racer chases it in on the
// same line, starting behind but flat out, closes on it through the hairpin
// and slingshots past on the last straight in a whoosh and a jolt, then
// dives onto the bar first, a big blast and a crit tier, the ghost slamming
// in a beat behind in a huge one. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { BTN_W, getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { lerp } from "../../../../shared/easing";
import { planRace } from "../../../../shared/race";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import { measure } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "timeTrial";
// px the lanes run above and below the bar, and past the button's end the
// hairpin's centre sits
const LANE = 70;
const PAST = 30;
const ENTRY = 120;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 24;
const DIVE_STEPS = 40;
const EXIT = 180;
const DIVE_RISE = 40;
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
// the racer's size, and the ghost's against it
const RACER = 0.045;
const GHOST = 0.6;
const BRAKE_SHAKE = 0.5;
const PASS_SHAKE = 1.0;
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forceTimeTrialEvent = registerWispEvent(
  KEY,
  "Time Trial",
  () => CONFIG.timeTrialEvent.chance,
  (floor, context, area) => {
    const { raceMs, leadMs, beatMs, holdMs, mergeMs } = CONFIG.timeTrialEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const low = bar.box.y + bar.box.height + LANE;
    const high = bar.box.y - LANE;
    const r = (low - high) / 2;
    const c: Point = { x: button.x + BTN_W / 2 + PAST, y: (low + high) / 2 };
    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    // in along under the bar, round the button's outer end, back over the top
    straight({ x: area.left - ENTRY, y: low }, { x: c.x, y: low });
    const turnFrom = line.length - 1;
    for (let i = 1; i <= TURN_STEPS; i++) {
      const a = Math.PI / 2 - (Math.PI * i) / TURN_STEPS;
      line.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
    const turnTo = line.length - 1;
    const out: Point = { x: bar.center.x + EXIT, y: high };
    straight(line[turnTo], out);
    const lead: Point = { x: bar.center.x, y: high - DIVE_RISE };
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, bar.center, i / DIVE_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const corners = [{ from: along[turnFrom], to: along[turnTo] }];
    const style = { corner: CORNER, finish: FINISH, braking: BRAKING };
    // the ghost sets off first; the racer, behind it, runs the lap quicker
    const ghost = planRace(line, raceMs, corners, style);
    const racerMs = raceMs - leadMs - beatMs;
    const racer = planRace(line, racerMs, corners, style);
    const racerIn = leadMs + racerMs;
    const ghostIn = raceMs;
    // the racer draws level where its share of the lap catches the ghost's
    const passAt = (leadMs * raceMs) / (raceMs - racerMs);
    const spots = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const ghostAt = (ms: number): Point | null =>
      ms > ghostIn ? null : ghost.at(ms, spots[0]);
    const racerAt = (ms: number): Point | null =>
      ms < leadMs || ms > racerIn ? null : racer.at(ms - leadMs, spots[1]);
    const size = Math.max(WISP_SIZE, (area.right - area.left) * RACER);
    const brakeS = along[turnFrom] * (1 - BRAKING);

    const braking = createBeats(
      [ghost.msAt(brakeS), leadMs + racer.msAt(brakeS)],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k === 0) playSwoosh();
        shakeScreen(BRAKE_SHAKE);
      },
    );
    const passing = createBeats(
      [passAt],
      (ms) => ms,
      () => {
        const at = racerAt(passAt);
        if (at) cover!.burst({ x: at.x, y: at.y }, 0.5);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(PASS_SHAKE);
      },
    );
    const finishing = createBeats(
      [racerIn, ghostIn],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        cover!.tierUp(bar, out);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FIRST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: ghostIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          braking.tick(ms, now);
          passing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawWispBetween(ctx, ghostAt, ms, now, size * GHOST, 0, 0, ghostIn);
          drawWispBetween(ctx, racerAt, ms, now, size, 0.8, leadMs, racerIn);
          drawDetonation(ctx, bar.center, ms - racerIn, FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
