// the "Chicane" event (race; free hires): it covers its crit, whose click
// freezes the screen while two racer wisps scream in off the right edge, one
// hard on the other's tail, flat out over the clicked button; they brake
// hard and flick down round its inner end and straight back out left along
// its foot through a tight chicane, a screech and a jolt on every turn-in,
// then power out and swoop onto the floor: the leader slams onto a new hire
// in a big blast, the chaser onto the next in a huge one, both workers
// forming out of the glow
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, lerp } from "../../shared/easing";
import { planRace } from "../../shared/race";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation } from "../../shared/explosion";
import { measure } from "../cashFlow";
import { BTN_H, BTN_W, getButtonCenter } from "../upgradeButton";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "chicane";
// px the racing line keeps off the button, and the chicane's corner radius
const PAD = 50;
const R = 55;
// speeds, as shares of its top speed: through the corners, and diving in
const CORNER = 0.3;
const FINISH = 1.3;
const BRAKING = 0.35;
const ENTRY = 80;
const STRAIGHT_STEP = 24;
const TURN_STEPS = 20;
const DIVE_STEPS = 36;
// px it powers out along the button's foot before swooping
const EXIT = 140;
const DIVE_LEAD = 160;
const WISP = 0.04;
// each corner's beats: braking, then the apex
const BEAT_SHAKE = [0.5, 1.1];
const FIRST_BLAST = 320;
const FIRST_SHAKE = 1.8;

export const forceChicaneEvent = registerWispEvent(
  KEY,
  "Chicane",
  () => CONFIG.chicaneEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapMs, holdMs, mergeMs } = CONFIG.chicaneEvent;
    const hires = findRewardHires(floor, context);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);

    const line: Point[] = [];
    const straight = (a: Point, b: Point) => {
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STRAIGHT_STEP),
      );
      for (let i = line.length ? 1 : 0; i <= n; i++)
        line.push({ x: lerp([a.x, b.x], i / n), y: lerp([a.y, b.y], i / n) });
    };
    const corner = (c: Point, from: number, to: number) => {
      for (let i = 1; i <= TURN_STEPS; i++) {
        const a = lerp([from, to], i / TURN_STEPS);
        line.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R });
      }
    };
    // the button sits against the right wall: flat out leftwards over it,
    // then down round its inner end...
    const high = button.y - BTN_H / 2 - PAD;
    const foot = button.y + BTN_H / 2;
    const down = button.x - BTN_W / 2 - PAD;
    const c1: Point = { x: down + R, y: high + R };
    straight({ x: area.right + ENTRY, y: high }, { x: c1.x, y: high });
    const firstFrom = line.length - 1;
    corner(c1, (Math.PI * 3) / 2, Math.PI);
    const firstTo = line.length - 1;
    // ...and flicked back out left along its foot
    const c2: Point = { x: down - R, y: foot - R };
    straight(line[firstTo], { x: down, y: c2.y });
    const secondFrom = line.length - 1;
    corner(c2, 0, Math.PI / 2);
    const secondTo = line.length - 1;
    const out: Point = { x: c2.x - EXIT, y: foot };
    straight(line[secondTo], out);
    const lead: Point = { x: out.x - DIVE_LEAD, y: out.y };
    const diveFrom = line.length - 1;
    const landings = [hires[0], hires[1] ?? hires[0]];
    for (let i = 1; i <= DIVE_STEPS; i++)
      line.push(bezier(out, lead, landings[0], i / DIVE_STEPS, { x: 0, y: 0 }));
    const along = measure(line);
    const race = planRace(
      line,
      raceMs,
      [
        { from: along[firstFrom], to: along[firstTo] },
        { from: along[secondFrom], to: along[secondTo] },
      ],
      { corner: CORNER, finish: FINISH, braking: BRAKING },
    );
    // the chaser peels off from the same dive point for its own hire
    const diveMs = race.msAt(along[diveFrom]);
    const arrivals = [raceMs, raceMs + gapMs];
    const spots = arrivals.map(() => ({ x: 0, y: 0 }));
    const ats = arrivals.map((arrives, racer) => (ms: number): Point | null => {
      if (ms < 0 || ms > arrives) return null;
      const t = ms - racer * gapMs;
      if (racer === 0 || t < diveMs) return race.at(t, spots[racer]);
      const u = clamp01((t - diveMs) / (raceMs - diveMs));
      return bezier(out, lead, landings[1], u * (0.6 + 0.4 * u), spots[racer]);
    });
    const size = Math.max(WISP_SIZE, width * WISP);

    // braking and apex of both corners, for both
    const beats: { ms: number; k: number; leader: boolean }[] = [];
    [
      along[firstFrom] * (1 - BRAKING),
      (along[firstFrom] + along[firstTo]) / 2,
      along[secondFrom],
      (along[secondFrom] + along[secondTo]) / 2,
    ].forEach((s, i) => {
      const ms = race.msAt(s);
      arrivals.forEach((_, racer) =>
        beats.push({ ms: ms + racer * gapMs, k: i % 2, leader: racer === 0 }),
      );
    });
    const cornering = createBeats(
      beats,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.leader && b.k === 0) playSwoosh();
        shakeScreen(BEAT_SHAKE[b.k]);
      },
    );
    const finishing = createBeats(
      arrivals,
      (ms) => ms,
      (_, racer) => {
        const hire = landings[racer];
        giveHire(hire);
        if (racer === 1) {
          cover!.blast(hire, 0);
          return;
        }
        cover!.burst(hire, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FIRST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: arrivals[1] + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          cornering.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, landings, now);
          for (let racer = 0; racer < ats.length; racer++)
            drawWispBetween(
              ctx,
              ats[racer],
              ms,
              now,
              size,
              0.6,
              racer * gapMs,
              arrivals[racer],
            );
          drawDetonation(ctx, landings[0], ms - arrivals[0], FIRST_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
