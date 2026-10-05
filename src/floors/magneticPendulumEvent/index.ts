// the "Magnetic Pendulum" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while glimmering magnets light up over every
// empty spot in view and a pendulum wisp, on a glowing thread from a pivot
// in the middle, is flung off the clicked floor's button; it swings
// chaotically between the magnets, yanked this way and that, every close
// pass a whoosh and a jolt that sets a new worker down under that magnet,
// slowing as it goes, until it's caught on one for good and that spot
// lands in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { stampGlimmer } from "../../shared/twinkle";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "magneticPendulum";
const MAX_HIRES = 4;
const STEP = 4;
// the pull back to the pivot (per ms², per px), each magnet's pull and how
// soft it is up close, the kick off the button (px/ms) and the damping
// (per ms) rising over the swing so it settles in time
const SPRING = 0.00011;
const MAGNET = 900;
const SOFT = 90;
const KICK = 1.3;
const DAMPING: [number, number] = [0.0004, 0.008];
// px a pass must come within to count, and the magnets' ring
const PASS = 130;
const RING = 44;
const GLIMMERS = 5;
const BOB = WISP_SIZE * 0.9;
const THREAD_W = 4;
const THREAD_ALPHA = 0.4;
const PASS_SHAKE = 0.9;

export const forceMagneticPendulumEvent = registerWispEvent(
  KEY,
  "Magnetic Pendulum",
  () => CONFIG.magneticPendulumEvent.chance,
  (floor, context) => {
    const { swingMs, settleMs, holdMs, mergeMs } = CONFIG.magneticPendulumEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const magnets: Point[] = hires.map((h) => ({ x: h.x, y: h.y - 40 }));
    const button = getButtonCenter(context.isGroundFloor);
    const pivot: Point = {
      x: magnets.reduce((s, m) => s + m.x, 0) / magnets.length,
      y: magnets.reduce((s, m) => s + m.y, 0) / magnets.length,
    };
    // the swing, simulated once
    const steps = Math.ceil(swingMs / STEP) + 1;
    const path = new Float32Array(steps * 2);
    let x = button.x;
    let y = button.y;
    const ox = button.x - pivot.x;
    const oy = button.y - pivot.y;
    const od = Math.hypot(ox, oy) || 1;
    let vx = (-oy / od) * KICK;
    let vy = (ox / od) * KICK;
    const passes: { k: number; ms: number }[] = [];
    const passed = magnets.map(() => false);
    for (let s = 0; s < steps; s++) {
      path[s * 2] = x;
      path[s * 2 + 1] = y;
      const ms = s * STEP;
      let ax = SPRING * (pivot.x - x);
      let ay = SPRING * (pivot.y - y);
      magnets.forEach((m, k) => {
        const dx = m.x - x;
        const dy = m.y - y;
        const d2 = dx * dx + dy * dy;
        const f = (MAGNET * SPRING) / (d2 + SOFT * SOFT) ** 1.5;
        ax += dx * f * SOFT * SOFT;
        ay += dy * f * SOFT * SOFT;
        if (!passed[k] && d2 < PASS * PASS) {
          passed[k] = true;
          passes.push({ k, ms });
        }
      });
      const damp = lerp(DAMPING, (ms / swingMs) ** 2);
      vx = (vx + ax * STEP) * (1 - damp * STEP);
      vy = (vy + ay * STEP) * (1 - damp * STEP);
      x += vx * STEP;
      y += vy * STEP;
    }
    // it's caught on the magnet nearest where the swing leaves it
    const lastX = path[(steps - 1) * 2];
    const lastY = path[(steps - 1) * 2 + 1];
    let caught = 0;
    magnets.forEach((m, k) => {
      if (
        Math.hypot(m.x - lastX, m.y - lastY) <
        Math.hypot(magnets[caught].x - lastX, magnets[caught].y - lastY)
      )
        caught = k;
    });
    const caughtAt = swingMs + settleMs;
    const spot: Point = { x: 0, y: 0 };
    const bobAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t >= swingMs) {
        const u = smoothstep(clamp01((t - swingMs) / settleMs));
        spot.x = lerp([lastX, magnets[caught].x], u);
        spot.y = lerp([lastY, magnets[caught].y], u);
        return spot;
      }
      const f = t / STEP;
      const s = Math.min(steps - 2, Math.floor(f));
      const u = f - s;
      spot.x = lerp([path[s * 2], path[s * 2 + 2]], u);
      spot.y = lerp([path[s * 2 + 1], path[s * 2 + 3]], u);
      return spot;
    };
    // the passes that land a hire, each spot once; the caught one at the end
    const landings = passes.filter((p) => p.k !== caught);
    landings.push({ k: caught, ms: caughtAt });

    const swinging = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      landings,
      (p) => p.ms,
      (p) => {
        giveHire(hires[p.k]);
        if (p.k === caught) {
          cover!.blast(magnets[p.k]);
          return;
        }
        cover!.burst(magnets[p.k], 0.6);
        if (!cover!.isLive()) return;
        playSwoosh();
        playExplosion();
        shakeScreen(PASS_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: caughtAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          swinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > caughtAt + 300) return;
          const grow = easeOut(clamp01(ms / 250));
          const fade = 1 - clamp01((ms - caughtAt) / 300);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const m of magnets)
            for (let g = 0; g < GLIMMERS; g++) {
              const a = (Math.PI * 2 * g) / GLIMMERS - ms * 0.003;
              stampGlimmer(
                ctx,
                m.x + Math.cos(a) * RING,
                m.y + Math.sin(a) * RING,
                12 * grow * fade,
                a,
                COLOR.heavenlyGold,
              );
            }
          stampGlimmer(
            ctx,
            pivot.x,
            pivot.y,
            18 * grow * fade,
            ms * 0.004,
            COLOR.white,
          );
          ctx.restore();
          const bob = bobAt(ms);
          drawBeam(ctx, pivot, bob, THREAD_W, THREAD_ALPHA * fade);
          drawWisp(ctx, bobAt, ms, now, BOB * fade, 0.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
