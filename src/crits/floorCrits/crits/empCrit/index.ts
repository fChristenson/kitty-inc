// the EMP floor crit: the number swells into a crackling orb and lets off a
// pulse that sweeps over the building; every bar in view shorts out, dark
// but for blips, spitting sparks from its ends through a tense beat of quiet,
// then the power surges back and the bars slam back on one after another from
// the top in runs of blasts, its own bar last and hardest
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const EM_IN_MS = 260;
const EM_SWELL_MS = 480;
const EM_PULSE_MS = EM_IN_MS + EM_SWELL_MS;
const EM_ORB: [number, number] = [1, 3];
// the pulse: px a ms, its ring's segments, width and reach of the viewport
const EM_SPEED = 3;
const EM_RING = 40;
const EM_RING_WIDTH = 60;
const EM_REACH = 1.4;
// dead this long after the pulse has passed every bar, then rebooting a bar
// every EM_BAR_MS from the top
const EM_DEAD_MS = 700;
const EM_BAR_MS = 140;
const EM_RUN = 5;
const EM_OWN_RUN = 7;
const EM_EVERY_MS = 45;
const EM_BLAST = 140;
const EM_OWN_BLAST = 170;
const EM_BOOM = 420;
// sparks spat out of a dead bar's ends
const EM_SPARKS = 6;
const EM_SPARK_REACH = 120;
const EM_SPARK_FALL = 80;
const EM_SPARK = 22;
const EM_PULSE_SHAKE = 2.4;
const EM_REBOOT_SHAKE = 1.6;
const EM_KICKED_PULSE = 1;
const EM_KICKED_REBOOT = 2;
// shakes by step: a short, a reboot blast, the last one
const EM_SHAKES = [0.8, 1, 3];
const EM_TAIL_MS = 1100;

interface Pulse {
  // when the pulse reaches each bar, and when it reboots
  reach: number[];
  on: number[];
  reboot: number;
  boom: number;
}
const pulses = new WeakMap<Running, Pulse>();

function planPulse(bars: Point[]): Pulse {
  const reach = bars.map((b) => EM_PULSE_MS + Math.hypot(b.x, b.y) / EM_SPEED);
  const reboot = Math.max(...reach) + EM_DEAD_MS;
  const on: number[] = [];
  ownLast(bars).forEach((bar, k) => {
    on[bar] = reboot + k * EM_BAR_MS;
  });
  return { reach, on, reboot, boom: on[0] + EM_OWN_RUN * EM_EVERY_MS };
}

const runOf = (bar: number) => (bar === 0 ? EM_OWN_RUN : EM_RUN);
const runSpot = (r: Running, bars: Point[], bar: number, j: number) =>
  along(r, bars, bar, (j / (runOf(bar) - 1)) * 2 - 1);

registerFloorCrit("empCrit", {
  plan(r, bars, hit, _lift, _crumble, _rocket, _heat, short) {
    const p = planPulse(bars);
    pulses.set(r, p);
    bars.forEach((_, bar) => {
      hit(bar, p.reach[bar], 0);
      short(bar, p.reach[bar], p.on[bar] - p.reach[bar]);
      for (let j = 0; j < runOf(bar); j++)
        hit(bar, p.on[bar] + j * EM_EVERY_MS, 1);
    });
    hit(0, p.boom, 2);
  },
  draw(ctx, r, ms, bars) {
    const p = pulses.get(r);
    if (!p) return;
    const now = r.startedAt + ms;
    if (ms < EM_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, 0, (ms / EM_IN_MS) ** 2),
      );
    if (ms >= EM_IN_MS && ms < EM_PULSE_MS) {
      const s = clamp01((ms - EM_IN_MS) / EM_SWELL_MS);
      drawWisp(
        ctx,
        () => ({ x: 0, y: 0 }),
        ms,
        now,
        WISP_SIZE * lerp(...EM_ORB, s),
        s,
      );
    }
    if (ms >= EM_PULSE_MS && r.kicked < EM_KICKED_PULSE) {
      r.kicked = EM_KICKED_PULSE;
      r.shake(EM_PULSE_SHAKE);
      playExplosion();
    }
    if (ms >= p.reboot && r.kicked < EM_KICKED_REBOOT) {
      r.kicked = EM_KICKED_REBOOT;
      r.shake(EM_REBOOT_SHAKE);
    }

    // the pulse sweeping out over the building
    const reach = r.viewportWidth * EM_REACH;
    const radius = (ms - EM_PULSE_MS) * EM_SPEED;
    if (radius >= 0 && radius < reach) {
      const alpha = 0.9 * (1 - radius / reach);
      const a = { x: 0, y: 0 };
      const b = { x: 0, y: 0 };
      for (let i = 0; i < EM_RING; i++) {
        const a0 = (i / EM_RING) * Math.PI * 2;
        const a1 = ((i + 1) / EM_RING) * Math.PI * 2;
        a.x = Math.cos(a0) * radius;
        a.y = Math.sin(a0) * radius;
        b.x = Math.cos(a1) * radius;
        b.y = Math.sin(a1) * radius;
        drawBeam(ctx, a, b, EM_RING_WIDTH, alpha);
      }
    }

    // sparks spitting from the dead bars' ends
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    bars.forEach((home, bar) => {
      if (ms < p.reach[bar] || ms >= p.on[bar]) return;
      for (const side of [-1, 1])
        for (let i = 0; i < EM_SPARKS; i++) {
          const u = (ms * 0.003 + holeHash(i, bar * 2 + side + 610)) % 1;
          stampGlimmer(
            ctx,
            home.x + side * (r.play.barHalfWidth + u * EM_SPARK_REACH),
            home.y + (holeHash(i, 611) - 0.5) * 60 + u * u * EM_SPARK_FALL,
            EM_SPARK * (1 - u),
            now * 0.006 + i,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
    });
    ctx.globalCompositeOperation = previous;

    bars.forEach((_, bar) => {
      for (let j = 0; j < runOf(bar); j++)
        drawDetonation(
          ctx,
          runSpot(r, bars, bar, j),
          ms - p.on[bar] - j * EM_EVERY_MS,
          bar === 0 ? EM_OWN_BLAST : EM_BLAST,
          now,
        );
    });
    drawDetonation(ctx, bars[0], ms - p.boom, EM_BOOM, now);
  },
  tailMs: EM_TAIL_MS,
  shake: (step) => EM_SHAKES[step] ?? EM_SHAKES[1],
});
