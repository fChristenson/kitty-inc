// the "Pit Stop" event (race; cash): it covers its crit, whose click freezes
// the screen while two racers scream up from below the screen nose to tail,
// flat out, brake hard into a hairpin round the end of the top bar in view,
// power back down and brake again into the pit: a hairpin under the clicked
// floor's button, where both stop dead with a jolt; the button gushes cash
// into them like a pit crew refuelling, and they launch out of the pit
// trailing long tails of cash, flat out up into the total, the leader in a
// big burst and the chaser right after in a huge blast, their tails pouring
// in behind them. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { planRace, type RaceCorner } from "../../../../shared/race";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "pitStop";
const REWARD = 4;
// coins fuelled into each racer, and how far back along the line its tail
// trails, in ms of its race
const COINS = 160;
const TAIL_MS = 380;
const FUEL_MS = 180;
const FUEL_BOW = 90;
// the hairpins' radius; the chaser stops this far behind the leader
const RADIUS = 90;
const BEHIND = 50;
const SAMPLE = 10;
const RACER = WISP_SIZE;
const CHASER = WISP_SIZE * 0.85;
const BRAKE_SHAKE = 0.35;
const APEX_SHAKE = 0.6;
const STOP_SHAKE = 0.8;
const LAUNCH_SHAKE = 0.9;
const FINISH_SHAKE = 1.3;

interface Racer {
  lag: number;
  // when it stops in the pit and what its race clock reads there
  stopMs: number;
  clockAt: (ms: number) => number;
}

export const forcePitStopEvent = registerWispEvent(
  KEY,
  "Pit Stop",
  () => CONFIG.pitStopEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, pitMs, holdMs, mergeMs } = CONFIG.pitStopEvent;
    const bars = findRewardBars(floor, context);
    const top = bars[0];
    if (!top) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;

    // round the top bar's end nearer the button (the far one's at the
    // screen's edge), then under the button
    const leftEnd = button.x < top.center.x;
    const turn: Point = {
      x: leftEnd ? top.box.x : top.box.x + top.box.width,
      y: top.center.y,
    };
    const s = leftEnd ? 1 : -1;
    const line: Point[] = [];
    let length = 0;
    const push = (p: Point) => {
      const prev = line[line.length - 1];
      if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
      line.push(p);
    };
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE),
      );
      for (let i = 1; i <= n; i++)
        push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    const arc = (c: Point, from: number, sweep: number): RaceCorner => {
      const enter = length;
      const n = Math.max(2, Math.round((Math.abs(sweep) * RADIUS) / SAMPLE));
      for (let i = 1; i <= n; i++) {
        const a = from + (sweep * i) / n;
        push({ x: c.x + Math.cos(a) * RADIUS, y: c.y + Math.sin(a) * RADIUS });
      }
      return { from: enter, to: length };
    };
    const start: Point = { x: turn.x - s * RADIUS, y: area.bottom + 150 };
    push(start);
    straight(start, { x: turn.x - s * RADIUS, y: turn.y });
    const first = arc(turn, s > 0 ? Math.PI : 0, s * Math.PI);
    straight(line[line.length - 1], { x: button.x + s * RADIUS, y: button.y });
    const pit = arc(button, s > 0 ? 0 : Math.PI, s * Math.PI);
    straight(line[line.length - 1], fallback);
    const race = planRace(line, raceMs, [first, pit]);
    const pitAt = (pit.from + pit.to) / 2;

    // each racer's own clock, held while it sits in the pit
    const racer = (lag: number, stopAt: number): Racer => {
      const stopMs = race.msAt(stopAt);
      return {
        lag,
        stopMs: stopMs + lag,
        clockAt: (ms) => {
          const t = ms - lag;
          return t < stopMs ? t : t < stopMs + pitMs ? stopMs : t - pitMs;
        },
      };
    };
    const leader = racer(0, pitAt);
    const chaser = racer(gapMs, pitAt - BEHIND);
    const finishMs = raceMs + pitMs;
    const lastIn = finishMs + gapMs + TAIL_MS;

    const paths: CoinPath[] = [];
    for (const r of [leader, chaser]) {
      const stopped = r.clockAt(r.stopMs);
      const parked = race.at(stopped, { x: 0, y: 0 });
      for (let j = 0; j < COINS; j++) {
        const fuels = r.stopMs + ((pitMs - FUEL_MS) * j) / COINS;
        const lagMs = (TAIL_MS * (j + 1)) / COINS;
        const bow: Point = {
          x: (button.x + parked.x) / 2 + (j % 2 ? FUEL_BOW : -FUEL_BOW),
          y: Math.min(button.y, parked.y) - FUEL_BOW,
        };
        paths.push((f: number) => {
          const ms = f * lastIn;
          if (ms < fuels) return { x: button.x, y: button.y, scale: 0 };
          if (ms < fuels + FUEL_MS)
            return bezier(
              button,
              bow,
              parked,
              easeOut((ms - fuels) / FUEL_MS),
              {
                x: 0,
                y: 0,
              },
            );
          const clock = Math.max(stopped, r.clockAt(ms) - lagMs);
          if (clock >= raceMs) return { ...total(), scale: 0 };
          return race.at(clock, { x: 0, y: 0 });
        });
      }
    }

    const brakes = [first, pit].map((c) =>
      race.msAt(Math.max(0, c.from - RADIUS)),
    );
    const apex = race.msAt((first.from + first.to) / 2);
    const braking = createBeats(
      [...brakes, ...brakes.map((ms) => ms + gapMs)],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BRAKE_SHAKE);
      },
    );
    const cornering = createBeats(
      [apex, apex + gapMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(APEX_SHAKE);
      },
    );
    const pitting = createBeats(
      [
        leader.stopMs,
        chaser.stopMs,
        leader.stopMs + pitMs,
        chaser.stopMs + pitMs,
      ],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k < 2) {
          playBloop();
          shakeScreen(STOP_SHAKE);
          return;
        }
        playSwoosh();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const finishing = createBeats(
      [finishMs, finishMs + gapMs, lastIn],
      (ms) => ms,
      (ms) => {
        if (ms === lastIn) {
          cover!.blast(total());
          return;
        }
        cover!.burst(total(), 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINISH_SHAKE);
      },
    );

    const spot = (r: Racer) => {
      const into: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const clock = r.clockAt(ms);
        return clock < 0 || clock > raceMs ? null : race.at(clock, into);
      };
    };
    const leaderAt = spot(leader);
    const chaserAt = spot(chaser);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          braking.tick(ms, now);
          cornering.tick(ms, now);
          pitting.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > finishMs + gapMs) return;
          drawWisp(ctx, chaserAt, ms, now, CHASER, 0.7);
          drawWisp(ctx, leaderAt, ms, now, RACER, 1);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, lastIn);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
