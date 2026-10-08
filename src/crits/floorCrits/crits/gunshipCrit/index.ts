// the gunship floor crit: the number turns into a gunship circling high over
// the building, hosing tracers down along each bar in view as it banks
// round, then one round from its big cannon onto its own bar
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { skyY } from "../../critPlayer/shared";

const GUN_IN_MS = 400;
// the orbit's top over the top bar, its half width (of the viewport's
// width) and half height
const GUN_ABOVE = 380;
const GUN_RX = 0.4;
const GUN_RY = 120;
const GUN_SHIP = 1.6;
const GUN_FONT = 60;
// each bar's burst: when the first starts, the gap between them, how long
// one rakes its bar, a round every so often, each in flight so long
const GUN_FIRST_MS = 250;
const GUN_GAP_MS = 450;
const GUN_BURST_MS = 380;
const GUN_ROUND_MS = 35;
const GUN_FLIGHT_MS = 160;
// a burst rakes its bar from this far along one side to the other
const GUN_RAKE = 0.85;
const GUN_TRACER_MS = 30;
const GUN_TRACER_W = 10;
const GUN_MUZZLE_MS = 50;
const GUN_MUZZLE = 60;
const GUN_IMPACT = 50;
// the cannon's round after the last burst, its flight, flash and blast
const GUN_CANNON_GAP_MS = 250;
const GUN_SHELL_MS = 240;
const GUN_CANNON_MUZZLE_MS = 80;
const GUN_CANNON_MUZZLE = 140;
const GUN_SHELL = 1.5;
const GUN_BOOM = 340;
// a burst's bar takes its hits at these points through it
const GUN_HITS = [0, 0.5, 1];
const GUN_SHAKE = 0.6;
const GUN_BOOM_SHAKE = 2.4;
const GUN_TAIL_MS = 1000;

const ROUNDS = Math.floor(GUN_BURST_MS / GUN_ROUND_MS);

// the bars it rakes, top to bottom: every other bar, or its own if alone
function raked(bars: Point[]): number[] {
  const order = byHeight(bars);
  return order.length > 1 ? order.filter((i) => i !== 0) : order;
}
const burstAt = (k: number) => GUN_IN_MS + GUN_FIRST_MS + k * GUN_GAP_MS;
const cannonAt = (bars: Point[]) =>
  burstAt(raked(bars).length - 1) + GUN_BURST_MS + GUN_CANNON_GAP_MS;

// one lap of its orbit, from the top, over the whole fight
function shipAt(r: Running, bars: Point[], ms: number): Point {
  const lap = cannonAt(bars) + GUN_SHELL_MS - GUN_IN_MS;
  const a =
    -Math.PI / 2 + ((Math.max(ms, GUN_IN_MS) - GUN_IN_MS) / lap) * Math.PI * 2;
  return {
    x: r.viewportWidth * GUN_RX * Math.cos(a),
    y: skyY(r, bars, GUN_ABOVE) + GUN_RY * (1 + Math.sin(a)),
  };
}

// round i of burst k: fired when, raking which way along its bar
const fireAt = (k: number, i: number) => burstAt(k) + i * GUN_ROUND_MS;
const rakeSide = (k: number, i: number) =>
  (k % 2 ? 1 : -1) * lerp(-GUN_RAKE, GUN_RAKE, i / Math.max(1, ROUNDS - 1));

registerFloorCrit("gunshipCrit", {
  plan(_r, bars, hit) {
    raked(bars).forEach((bar, k) => {
      for (const u of GUN_HITS)
        hit(
          bar,
          burstAt(k) + GUN_FLIGHT_MS + u * (GUN_BURST_MS - GUN_ROUND_MS),
        );
    });
    hit(0, cannonAt(bars) + GUN_SHELL_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const ship = (t: number) => shipAt(r, bars, t);
    if (ms < GUN_IN_MS) {
      const p = smoothstep(ms / GUN_IN_MS);
      const to = ship(GUN_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p,
        lerp(r.flashFont, GUN_FONT, p),
      );
    }
    const cannon = cannonAt(bars);
    const land = cannon + GUN_SHELL_MS;
    if (ms >= GUN_IN_MS)
      drawWispBetween(
        ctx,
        ship,
        ms,
        now,
        WISP_SIZE * GUN_SHIP,
        0.5,
        GUN_IN_MS,
        land,
      );
    raked(bars).forEach((bar, k) => {
      for (let i = 0; i < ROUNDS; i++) {
        const fire = fireAt(k, i);
        const dt = ms - fire;
        if (dt < 0 || dt > GUN_FLIGHT_MS + 200) continue;
        const from = ship(fire);
        const to = along(r, bars, bar, rakeSide(k, i));
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        drawMuzzleFlash(ctx, from, angle, dt / GUN_MUZZLE_MS, GUN_MUZZLE);
        if (dt < GUN_FLIGHT_MS) {
          const p = dt / GUN_FLIGHT_MS;
          const q = Math.max(0, (dt - GUN_TRACER_MS) / GUN_FLIGHT_MS);
          drawBeam(
            ctx,
            { x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q) },
            { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) },
            GUN_TRACER_W,
            0.9,
          );
        }
        drawDetonation(ctx, to, dt - GUN_FLIGHT_MS, GUN_IMPACT, now);
      }
    });
    // the cannon's round, fired from where the ship is onto its own bar
    const from = ship(cannon);
    const own = bars[0];
    drawMuzzleFlash(
      ctx,
      from,
      Math.atan2(own.y - from.y, own.x - from.x),
      (ms - cannon) / GUN_CANNON_MUZZLE_MS,
      GUN_CANNON_MUZZLE,
    );
    drawWispBetween(
      ctx,
      (t) => {
        if (t < cannon) return null;
        const p = clamp01((t - cannon) / GUN_SHELL_MS);
        return { x: lerp(from.x, own.x, p), y: lerp(from.y, own.y, p) };
      },
      ms,
      now,
      WISP_SIZE * GUN_SHELL,
      1,
      cannon,
      land,
    );
    if (ms >= land && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
    drawDetonation(ctx, own, ms - land, GUN_BOOM, now);
  },
  tailMs: GUN_TAIL_MS,
  shake: (step) => (step ? GUN_BOOM_SHAKE : GUN_SHAKE),
});
