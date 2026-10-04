// the "Spinning Hexagon" event (bounce; cash): it covers its crit, whose
// click freezes the screen while a hexagon of light walls spins up in the
// middle of the screen with a ball wisp dropped inside; the ball falls and
// bounces off the turning walls, flung about by them, every bounce a
// splash, a boing, a jolt and a spray of cash, the hexagon spinning faster
// and faster and the ball rattling round ever wilder; then the walls burst
// apart and the ball shoots off into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawBounceSplash, type Bounce } from "../../shared/bounce";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "spinningHexagon";
const REWARD = 4;
const SIDES = 6;
const RADIUS = 210;
const BALL_R = 14;
const STEP_MS = 4;
// px per s², and rad a second the hexagon turns at first and at full spin
const GRAVITY = 1400;
const SPIN: [number, number] = [0.8, 4.5];
// how much of its speed the ball keeps off a wall, and the wall's kick
const BOUNCE = 0.92;
const KICK = 1.0;
const WALL_W = 8;
const BURST_MS = 260;
const FLY_MS = 420;
const SPLASH = 70;
const BALL = 0.45;
const COINS = 10;
const BOING_GAP_MS = 50;
const BOUNCE_SHAKE: [number, number] = [0.2, 0.6];

export const forceSpinningHexagonEvent = registerWispEvent(
  KEY,
  "Spinning Hexagon",
  () => CONFIG.spinningHexagonEvent.chance,
  (floor, context, area) => {
    const { spinMs, holdMs, mergeMs } = CONFIG.spinningHexagonEvent;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.45,
    };
    const total = totalSpot(area);
    const seconds = spinMs / 1000;
    const turned = (ms: number) => {
      const s = Math.min(Math.max(0, ms), spinMs) / 1000;
      return SPIN[0] * s + ((SPIN[1] - SPIN[0]) * s * s) / (2 * seconds);
    };
    const spinAt = (ms: number) =>
      lerp(SPIN, clamp01(Math.max(0, ms) / spinMs));
    const apothem = RADIUS * Math.cos(Math.PI / SIDES);
    // the ball stepped through at arm: gravity, and off each wall moving with
    // the spin
    const steps = Math.ceil(spinMs / STEP_MS) + 1;
    const track = new Float32Array(steps * 2);
    const bounces: Bounce[] = [];
    let x = 0;
    let y = -apothem * 0.4;
    let vx = 0;
    let vy = 0;
    const dt = STEP_MS / 1000;
    for (let s = 0; s < steps; s++) {
      const ms = s * STEP_MS;
      track[s * 2] = centre.x + x;
      track[s * 2 + 1] = centre.y + y;
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      const turn = turned(ms);
      const w = spinAt(ms);
      for (let k = 0; k < SIDES; k++) {
        const a = turn + ((k + 0.5) / SIDES) * Math.PI * 2;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        const out = x * nx + y * ny - (apothem - BALL_R);
        if (out <= 0) continue;
        x -= nx * out;
        y -= ny * out;
        // the wall's own velocity where the ball meets it
        const wx = -w * y;
        const wy = w * x;
        const rvx = vx - wx;
        const rvy = vy - wy;
        const into = rvx * nx + rvy * ny;
        if (into <= 0) continue;
        vx = wx + (rvx - (1 + BOUNCE) * into * nx) * KICK;
        vy = wy + (rvy - (1 + BOUNCE) * into * ny) * KICK;
        if (!bounces.length || ms - bounces[bounces.length - 1].ms > 60)
          bounces.push({
            at: {
              x: centre.x + x + nx * BALL_R,
              y: centre.y + y + ny * BALL_R,
            },
            ms,
            normal: a + Math.PI,
          });
      }
    }
    const bursts = spinMs;
    const endAt = bursts + FLY_MS;
    const spot: Point = { x: 0, y: 0 };
    const burstFrom: Point = {
      x: track[(steps - 1) * 2],
      y: track[(steps - 1) * 2 + 1],
    };
    const ballAt = (ms: number): Point => {
      if (ms < bursts) {
        const s = Math.min(steps - 1, Math.max(0, Math.floor(ms / STEP_MS)));
        spot.x = track[s * 2];
        spot.y = track[s * 2 + 1];
        return spot;
      }
      const u = easeIn(clamp01((ms - bursts) / FLY_MS));
      const to = cover?.total() ?? total;
      spot.x = lerp([burstFrom.x, to.x], u);
      spot.y = lerp([burstFrom.y, to.y], u);
      return spot;
    };
    const corner: Point = { x: 0, y: 0 };
    const next: Point = { x: 0, y: 0 };

    let boing = -Infinity;
    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, COINS, [40, 160], b.normal, 1.6),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        shakeScreen(lerp(BOUNCE_SHAKE, b.ms / spinMs));
        if (b.ms - boing < BOING_GAP_MS) return;
        boing = b.ms;
        playBloop();
      },
    );
    const bursting = createBeats(
      [bursts, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(centre, 0.9);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BOUNCE_SHAKE[1]);
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
          bouncing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          // the walls, flying apart at the burst
          if (ms < bursts + BURST_MS) {
            const open = clamp01((ms - bursts) / BURST_MS);
            const turn = turned(ms);
            for (let k = 0; k < SIDES; k++) {
              const a0 = turn + (k / SIDES) * Math.PI * 2;
              const a1 = turn + ((k + 1) / SIDES) * Math.PI * 2;
              const mid = (a0 + a1) / 2;
              const push = RADIUS * open * 1.5;
              corner.x =
                centre.x + Math.cos(a0) * RADIUS + Math.cos(mid) * push;
              corner.y =
                centre.y + Math.sin(a0) * RADIUS + Math.sin(mid) * push;
              next.x = centre.x + Math.cos(a1) * RADIUS + Math.cos(mid) * push;
              next.y = centre.y + Math.sin(a1) * RADIUS + Math.sin(mid) * push;
              drawBeam(ctx, corner, next, WALL_W, 1 - open);
            }
          }
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWispBetween(ctx, ballAt, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
