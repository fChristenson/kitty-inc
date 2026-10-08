// the "Sieve" event (experiment: the Sieve of Eratosthenes; cash): it covers
// its crit, whose click freezes the screen while a 7 × 7 grid of glittering
// dots twinkles in over the middle of the screen, the numbers 1 to 49; a
// cursor wisp lands on 2 and lights it gold, then hops along every second
// dot popping each, lands on 3 and hops its multiples, then 5, then 7,
// quicker and quicker, every pop a spark and a tick of a jolt, until only
// the primes are left blazing; they fire their cash one after another in a
// rippling chain of bursts and the grid goes off in a blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { getButtonCenter } from "../../../../floors/upgradeButton";

const KEY = "sieve";
const REWARD = 4;
const SIDE = 7;
const COUNT = SIDE * SIDE;
const SIEVING = [2, 3, 5, 7];
// the grid's span as a share of the screen's width and height
const SPAN: [number, number] = [0.66, 0.44];
const APPEAR_MS = 240;
// ms it pauses on each prime it picks, and how high it hops
const PICK_MS = 120;
const LIFT = 0.35;
const DOT = 9;
const PICKED = 14;
const BLAZE = 20;
const POP_MS = 220;
const BLAZE_GAP = 45;
const PRIME_COINS = 5;
const PRIME_RING: [number, number] = [40, 130];
const CURSOR = 0.55;
const POP_SHAKE = 0.15;
const PICK_SHAKE = 0.5;
const FIRE_SHAKE = 0.6;

interface Hop {
  n: number;
  at: Point;
  // when it lands, and whether it picks a prime there or pops a multiple
  ms: number;
  picks: boolean;
}

export const forceSieveEvent = registerWispEvent(
  KEY,
  "Sieve",
  () => CONFIG.sieveEvent.chance,
  (floor, context, area) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.sieveEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width * SPAN[0], height * SPAN[1]);
    const step = span / (SIDE - 1);
    const left = (area.left + area.right) / 2 - span / 2;
    const top = area.top + height * 0.47 - span / 2;
    const centre: Point = { x: left + span / 2, y: top + span / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    // dot n (1..49) sits row by row
    const dots: Point[] = Array.from({ length: COUNT + 1 }, (_, n) => ({
      x: left + ((n - 1) % SIDE) * step,
      y: top + Math.floor((n - 1) / SIDE) * step,
    }));

    // the sieve: pick each prime, then pop its multiples still standing
    const popped: number[] = new Array(COUNT + 1).fill(Infinity);
    const picked: number[] = new Array(COUNT + 1).fill(Infinity);
    popped[1] = APPEAR_MS;
    const plan: { n: number; picks: boolean }[] = [];
    for (const p of SIEVING) {
      plan.push({ n: p, picks: true });
      for (let m = p * p; m <= COUNT; m += p)
        if (!plan.some((h) => h.n === m && !h.picks))
          plan.push({ n: m, picks: false });
    }
    const hops: Hop[] = [];
    let clock: number = APPEAR_MS;
    plan.forEach((h, k) => {
      clock += lerp(hopsMs, k / (plan.length - 1));
      hops.push({ n: h.n, at: dots[h.n], ms: clock, picks: h.picks });
      if (h.picks) {
        picked[h.n] = clock;
        clock += PICK_MS;
      } else popped[h.n] = clock;
    });
    const sieved = clock;
    const primes: number[] = [];
    for (let n = 2; n <= COUNT; n++) if (popped[n] === Infinity) primes.push(n);
    const fires = primes.map((_, k) => sieved + 120 + k * BLAZE_GAP);
    const lastFire = fires[fires.length - 1];
    const endAt = lastFire + POP_MS;

    // the cursor, hopping in arcs from the button dot to dot
    const spot: Point = { x: 0, y: 0 };
    const cursorAt = (ms: number): Point | null => {
      if (ms < 0 || ms > sieved) return null;
      let from: Point = button;
      let leaves = 0;
      for (const h of hops) {
        if (ms < h.ms) {
          const u = smoothstep(clamp01((ms - leaves) / (h.ms - leaves)));
          const d = Math.hypot(h.at.x - from.x, h.at.y - from.y);
          spot.x = lerp([from.x, h.at.x], u);
          spot.y = lerp([from.y, h.at.y], u) - Math.sin(Math.PI * u) * d * LIFT;
          return spot;
        }
        from = h.at;
        leaves = h.picks ? h.ms + PICK_MS : h.ms;
      }
      return from;
    };

    const hopping = createBeats(
      hops,
      (h) => h.ms,
      (h) => {
        cover!.burst(h.at, h.picks ? 0.4 : 0.2);
        if (!cover!.isLive()) return;
        if (h.picks) playBloop();
        shakeScreen(h.picks ? PICK_SHAKE : POP_SHAKE);
      },
    );
    const firing = createBeats(
      fires,
      (ms) => ms,
      (ms, k) => {
        const at = dots[primes[k]];
        if (ms === lastFire) {
          cover!.blast(centre);
          return;
        }
        cover!.launchFrom(at, ringTargets(at, PRIME_COINS, PRIME_RING));
        cover!.burst(at, 0.4);
        if (!cover!.isLive()) return;
        if (k % 3 === 0) playExplosion();
        shakeScreen(FIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hopping.tick(ms, now);
          firing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let n = 1; n <= COUNT; n++) {
            const at = dots[n];
            const shown = easeOut(
              clamp01((ms - (n / COUNT) * APPEAR_MS * 0.6) / 120),
            );
            const since = ms - popped[n];
            if (since > POP_MS) continue;
            if (since >= 0) {
              // popped: a spark that flares and dies
              const t = since / POP_MS;
              drawGlitterLight(
                ctx,
                at.x,
                at.y,
                DOT * (1 + 1.5 * t),
                n,
                1 - t,
                now,
              );
              continue;
            }
            const k = primes.indexOf(n);
            if (k >= 0 && ms > sieved) {
              const t = (ms - fires[k]) / POP_MS;
              if (t > 1) continue;
              const pulse = 1 + 0.2 * Math.sin(ms * 0.04 + n);
              drawGlitterLight(
                ctx,
                at.x,
                at.y,
                BLAZE * pulse * (t > 0 ? 1 + t : 1),
                n,
                t > 0 ? 1 - t : 1,
                now,
              );
              continue;
            }
            drawGlitterLight(
              ctx,
              at.x,
              at.y,
              ms >= picked[n] ? PICKED : DOT,
              n,
              shown,
              now,
            );
          }
          drawWisp(ctx, cursorAt, ms, now, WISP_SIZE * CURSOR, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
