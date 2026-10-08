// the "Murmuration" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while a flock of wisps bursts out of the clicked
// floor's button and swirls over the screen like a murmuration of starlings,
// the whole cloud stretching, folding and wheeling as one, every sharp turn a
// whoosh and a jolt; then it breaks apart, a stream of wisps peeling off and
// diving onto each empty spot, where a new worker forms in a flash and a
// jolt, the last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "murmuration";
const BIRDS = 20;
const MAX_HIRES = 5;
const SIZE = WISP_SIZE * 0.45;
const STEP_MS = 16;
// the flock's pulls: toward its middle, matching its neighbours' heading,
// away from any too close, and after the leading point it chases
const COHESION = 0.0004;
const ALIGN = 0.06;
const SEPARATE = 0.02;
const NEAR = 46;
const CHASE = 0.0008;
// px per ms it flies, at least and at most
const SPEED: [number, number] = [0.45, 1.1];
// the point it chases sweeps round the screen in a lissajous figure
const SWEEP: [number, number] = [0.34, 0.24];
const SWEEP_HZ: [number, number] = [0.6, 0.95];
const TURNS = 3;
const FORM_MS = 300;
const TURN_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceMurmurationEvent = registerWispEvent(
  KEY,
  "Murmuration",
  () => CONFIG.murmurationEvent.chance,
  (floor, context, area) => {
    const { flockMs, diveMs, gapMs, holdMs, mergeMs } = CONFIG.murmurationEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.45,
    };
    const button = getButtonCenter(context.isGroundFloor);
    const lead = (ms: number): Point => ({
      x:
        mid.x +
        Math.sin((ms / 1000) * Math.PI * 2 * SWEEP_HZ[0]) * width * SWEEP[0],
      y:
        mid.y +
        Math.sin((ms / 1000) * Math.PI * 2 * SWEEP_HZ[1]) * height * SWEEP[1],
    });

    // the flock flown at arm, every bird's spot each STEP_MS
    const steps = Math.ceil(flockMs / STEP_MS);
    const pos = Array.from({ length: BIRDS }, () => ({
      x: button.x + (Math.random() - 0.5) * 40,
      y: button.y + (Math.random() - 0.5) * 40,
    }));
    const vel = pos.map(() => {
      const a = Math.random() * Math.PI * 2;
      return { x: Math.cos(a) * SPEED[1], y: Math.sin(a) * SPEED[1] - 0.4 };
    });
    const tracks: Float32Array[] = pos.map(
      () => new Float32Array((steps + 1) * 2),
    );
    const record = (s: number) =>
      pos.forEach((p, i) => {
        tracks[i][s * 2] = p.x;
        tracks[i][s * 2 + 1] = p.y;
      });
    record(0);
    for (let s = 1; s <= steps; s++) {
      let cx = 0;
      let cy = 0;
      let vx = 0;
      let vy = 0;
      for (let i = 0; i < BIRDS; i++) {
        cx += pos[i].x;
        cy += pos[i].y;
        vx += vel[i].x;
        vy += vel[i].y;
      }
      cx /= BIRDS;
      cy /= BIRDS;
      vx /= BIRDS;
      vy /= BIRDS;
      const target = lead(s * STEP_MS);
      for (let i = 0; i < BIRDS; i++) {
        const p = pos[i];
        const v = vel[i];
        let ax = (cx - p.x) * COHESION + (target.x - p.x) * CHASE;
        let ay = (cy - p.y) * COHESION + (target.y - p.y) * CHASE;
        for (let j = 0; j < BIRDS; j++) {
          if (j === i) continue;
          const dx = p.x - pos[j].x;
          const dy = p.y - pos[j].y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < NEAR) {
            ax += (dx / d) * SEPARATE * (1 - d / NEAR);
            ay += (dy / d) * SEPARATE * (1 - d / NEAR);
          }
        }
        v.x += ax * STEP_MS + (vx - v.x) * ALIGN;
        v.y += ay * STEP_MS + (vy - v.y) * ALIGN;
        const speed = Math.hypot(v.x, v.y) || 1;
        const clamped = Math.min(SPEED[1], Math.max(SPEED[0], speed));
        v.x *= clamped / speed;
        v.y *= clamped / speed;
      }
      for (let i = 0; i < BIRDS; i++) {
        pos[i].x += vel[i].x * STEP_MS;
        pos[i].y += vel[i].y * STEP_MS;
      }
      record(s);
    }

    // then the flock peels off, a stream diving onto each spot in turn
    const lands = hires.map((_, k) => flockMs + diveMs + k * gapMs);
    const dives = pos.map((_, i) => {
      const k = i % hires.length;
      const starts =
        flockMs + k * gapMs + ((Math.floor(i / hires.length) % 4) * gapMs) / 4;
      return { k, starts, ends: Math.min(lands[k], starts + diveMs) };
    });
    const endAt = lands[lands.length - 1];
    const spots = pos.map(() => ({ x: 0, y: 0 }));
    const bend = { x: 0, y: 0 };
    const from = { x: 0, y: 0 };
    const ats = tracks.map((track, i) => (ms: number): Point | null => {
      const dive = dives[i];
      if (ms > dive.ends) return null;
      const spot = spots[i];
      const s = Math.min(dive.starts, Math.max(0, ms)) / STEP_MS;
      const a = Math.min(steps, Math.floor(s));
      const b = Math.min(steps, a + 1);
      const f = s - a;
      spot.x = lerp([track[a * 2], track[b * 2]], f);
      spot.y = lerp([track[a * 2 + 1], track[b * 2 + 1]], f);
      if (ms <= dive.starts) return spot;
      const hire = hires[dive.k];
      from.x = spot.x;
      from.y = spot.y;
      bend.x = from.x;
      bend.y = Math.min(from.y, hire.y) - 160;
      return bezier(
        from,
        bend,
        hire,
        easeIn(clamp01((ms - dive.starts) / (dive.ends - dive.starts))),
        spot,
      );
    });

    const turning = createBeats(
      Array.from(
        { length: TURNS },
        (_, k) => ((k + 1) / (TURNS + 1)) * flockMs,
      ),
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(TURN_SHAKE);
      },
    );
    const landing = createBeats(
      lands,
      (ms) => ms,
      (_, k) => {
        const hire = hires[k];
        giveHire(hire);
        if (k === hires.length - 1) {
          cover!.blast(hire);
          return;
        }
        cover!.burst(hire, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hires.length - 1)));
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
          turning.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          for (let i = 0; i < ats.length; i++)
            drawWispBetween(ctx, ats[i], ms, now, SIZE, 0.6, 0, dives[i].ends);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
