// the "Waggle Dance" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while a scout wisp lands on the clicked floor's
// button and does a bee's waggle dance: a buzzing, wiggling run straight at
// an empty spot, looping back round to waggle again; then a stream of bee
// wisps pours out of the button along the heading it danced, swarms the
// spot in a whirl and a new worker forms with a flash and a jolt; dance
// after dance, quicker each time, the last swarm landing in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "waggleDance";
const MAX_HIRES = 4;
const RUNS = 2;
const RUN = 90;
const WIGGLE = 9;
const WIGGLES = 5;
const BEES = 6;
const BEE_GAP_MS = 35;
const FLY_MS = 360;
const SWIRL_MS = 220;
const SWIRL = 34;
const SCOUT = 0.4;
const BEE = 0.22;
const FORM_MS = 300;
const RUN_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Dance {
  hire: RewardHire;
  // the heading it waggles along, and the side it loops back round
  dx: number;
  dy: number;
  starts: number;
  runMs: number;
  loopMs: number;
  ends: number;
  forms: number;
  bends: Point[];
}

export const forceWaggleDanceEvent = registerWispEvent(
  KEY,
  "Waggle Dance",
  () => CONFIG.waggleDanceEvent.chance,
  (floor, context) => {
    const { runsMs, holdMs, mergeMs } = CONFIG.waggleDanceEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const hive = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const dances: Dance[] = hires.map((hire, k) => {
      const reach = Math.hypot(hire.x - hive.x, hire.y - hive.y) || 1;
      const dx = (hire.x - hive.x) / reach;
      const dy = (hire.y - hive.y) / reach;
      const runMs = lerp(runsMs, k / Math.max(1, hires.length - 1));
      const loopMs = runMs * 0.8;
      const starts = clock;
      const ends = starts + RUNS * (runMs + loopMs);
      clock = ends;
      // each bee bowed a little off the dead-straight heading
      const bends = Array.from({ length: BEES }, () => {
        const off = (Math.random() - 0.5) * reach * 0.4;
        return {
          x: (hive.x + hire.x) / 2 - dy * off,
          y: (hive.y + hire.y) / 2 + dx * off,
        };
      });
      return {
        hire,
        dx,
        dy,
        starts,
        runMs,
        loopMs,
        ends,
        forms: ends + (BEES - 1) * BEE_GAP_MS + FLY_MS + SWIRL_MS,
        bends,
      };
    });
    const last = dances[dances.length - 1];
    const endAt = last.forms;
    const spot: Point = { x: 0, y: 0 };
    // waggle out along the heading, loop back round to the hive, alternately
    // left and right
    const scoutAt = (ms: number): Point | null => {
      if (ms > last.ends) return null;
      const t = Math.max(0, ms);
      let d = dances[0];
      for (const dance of dances) {
        d = dance;
        if (t < dance.ends) break;
      }
      const cycle = d.runMs + d.loopMs;
      const n = Math.min(RUNS - 1, Math.floor((t - d.starts) / cycle));
      const within = t - d.starts - n * cycle;
      const nx = -d.dy;
      const ny = d.dx;
      if (within < d.runMs) {
        const u = within / d.runMs;
        const wiggle = Math.sin(u * Math.PI * 2 * WIGGLES) * WIGGLE;
        spot.x = hive.x + d.dx * RUN * u + nx * wiggle;
        spot.y = hive.y + d.dy * RUN * u + ny * wiggle;
        return spot;
      }
      const u = smoothstep(clamp01((within - d.runMs) / d.loopMs));
      const side = n % 2 ? 1 : -1;
      const a = Math.PI * u;
      const along = (RUN / 2) * (1 + Math.cos(a));
      const off = (RUN / 2) * Math.sin(a) * side;
      spot.x = hive.x + d.dx * along + nx * off;
      spot.y = hive.y + d.dy * along + ny * off;
      return spot;
    };
    const bees = dances.flatMap((d) =>
      d.bends.map((bend, i) => {
        const leaves = d.ends + i * BEE_GAP_MS;
        const arrives = leaves + FLY_MS;
        const to: Point = { x: d.hire.x, y: d.hire.y };
        const at: Point = { x: 0, y: 0 };
        const phase = (i / BEES) * Math.PI * 2;
        return {
          leaves,
          forms: d.forms,
          at: (ms: number): Point | null => {
            if (ms < leaves || ms > d.forms) return null;
            if (ms < arrives) {
              const u = easeOut((ms - leaves) / FLY_MS);
              return bezier(hive, bend, to, u, at);
            }
            // whirling round the spot, closing in as the worker forms
            const u = clamp01((ms - arrives) / (d.forms - arrives));
            const a = phase + u * Math.PI * 4;
            at.x = to.x + Math.cos(a) * SWIRL * (1 - u);
            at.y = to.y + Math.sin(a) * SWIRL * 0.6 * (1 - u);
            return at;
          },
        };
      }),
    );

    const running = createBeats(
      dances.flatMap((d) =>
        Array.from(
          { length: RUNS },
          (_, n) => d.starts + n * (d.runMs + d.loopMs),
        ),
      ),
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUN_SHAKE);
      },
    );
    const leaving = createBeats(
      dances,
      (d) => d.ends,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const forming = createBeats(
      dances,
      (d) => d.forms,
      (d, k) => {
        giveHire(d.hire);
        const at: Point = { x: d.hire.x, y: d.hire.y };
        if (d === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, dances.length - 1)));
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
          running.tick(ms, now);
          leaving.tick(ms, now);
          forming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of bees)
            if (ms >= b.leaves && ms <= b.forms)
              drawWispHead(ctx, b.at, ms, now, WISP_SIZE * BEE, 0.6);
          drawWisp(ctx, scoutAt, ms, now, WISP_SIZE * SCOUT, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
