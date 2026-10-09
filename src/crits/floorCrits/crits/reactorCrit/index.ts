// the reactor floor crit: the number becomes a core in the middle of the
// screen; beams lock onto every bar in view one by one, pumping glitter down
// into them, while the core spins up, ringed by orbiting glitter, pulsing
// whiter and shaking harder; at critical the beams flare, every bar blows out
// from its middle to its ends at once, and the core bursts onto its own bar
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
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
  glowStops,
} from "../../critPlayer";
import { ownLast } from "../../critPlayer/shared";

const RC_IN_MS = 260;
const RC_CORE: Point = { x: 0, y: 0 };
// a beam locks onto a bar every RC_LOCK_MS, reaching it over RC_REACH_MS;
// critical comes RC_CHARGE_MS after the last
const RC_FIRST_LOCK_MS = RC_IN_MS + 150;
const RC_LOCK_MS = 140;
const RC_REACH_MS = 80;
const RC_CHARGE_MS = 900;
const RC_BEAM: [number, number] = [30, 70];
const RC_FLARE_BEAM = 120;
const RC_PUMPED = 8;
const RC_PUMP: [number, number] = [0.0015, 0.0055];
const RC_ORBITERS = 24;
const RC_ORBIT = 170;
const RC_ORBIT_Y = 0.45;
const RC_SPIN: [number, number] = [0.003, 0.015];
const RC_CORE_SIZE: [number, number] = [1.6, 3];
const RC_CORE_GLOW: [number, number] = [200, 500];
const RC_RUMBLE_MS = 90;
const RC_RUMBLE: [number, number] = [0.2, 0.8];
// at critical: blasts racing out from each bar's middle to its ends, then
// the core bursting, then its own bar's huge blast
const RC_RACE = 3;
const RC_EVERY_MS = 45;
const RC_BLAST = 140;
const RC_OWN_BLAST = 170;
const RC_CORE_BLAST = 380;
const RC_CORE_BURST_MS = RC_RACE * RC_EVERY_MS;
const RC_BOOM_MS = RC_CORE_BURST_MS + 120;
const RC_BOOM = 420;
const RC_CRITICAL_SHAKE = 2;
const RC_CORE_SHAKE = 2.4;
const RC_KICKED_CRITICAL = 1e6;
const RC_KICKED_CORE = 2e6;
// shakes by step: a lock, a blast, the last one
const RC_SHAKES = [0.4, 0.8, 3];
const RC_TAIL_MS = 1100;

const lockAt = (k: number) => RC_FIRST_LOCK_MS + k * RC_LOCK_MS;
const criticalAt = (bars: Point[]) => lockAt(bars.length - 1) + RC_CHARGE_MS;
// blast j of a race out from a bar's middle: 0 its middle, then out both ways
const raceSpots = (r: Running, bars: Point[], bar: number) =>
  Array.from({ length: RC_RACE }, (_, j) =>
    (j ? [-1, 1] : [0]).map((side) =>
      along(r, bars, bar, (side * j) / (RC_RACE - 1)),
    ),
  );

registerFloorCrit("reactorCrit", {
  plan(_r, bars, hit) {
    const critical = criticalAt(bars);
    ownLast(bars).forEach((bar, k) => {
      hit(bar, lockAt(k), 0);
      for (let j = 0; j < RC_RACE; j++) hit(bar, critical + j * RC_EVERY_MS, 1);
    });
    hit(0, critical + RC_BOOM_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = ownLast(bars);
    const first = lockAt(0);
    const critical = criticalAt(bars);
    const coreBurst = critical + RC_CORE_BURST_MS;
    const c = clamp01((ms - first) / (critical - first)) ** 1.5;
    if (ms < RC_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, 0, (ms / RC_IN_MS) ** 2),
      );

    // the rumble building to critical, then critical and the core's burst
    if (ms >= first && ms < critical) {
      const due = Math.floor((ms - first) / RC_RUMBLE_MS) + 1;
      while (r.kicked < due) {
        r.kicked++;
        r.shake(lerp(...RC_RUMBLE, c));
      }
    }
    if (ms >= critical && r.kicked < RC_KICKED_CRITICAL) {
      r.kicked = RC_KICKED_CRITICAL;
      r.shake(RC_CRITICAL_SHAKE);
    }
    if (ms >= coreBurst && r.kicked < RC_KICKED_CORE) {
      r.kicked = RC_KICKED_CORE;
      r.shake(RC_CORE_SHAKE);
      playExplosion();
    }

    if (ms >= RC_IN_MS && ms < coreBurst) {
      const flare =
        ms >= critical ? 1 - (ms - critical) / (coreBurst - critical) : 0;
      // the beams, reaching out to lock on, then thickening
      order.forEach((bar, k) => {
        if (ms < lockAt(k)) return;
        const reach = clamp01((ms - lockAt(k)) / RC_REACH_MS);
        const to = bars[bar];
        drawBeam(
          ctx,
          RC_CORE,
          { x: lerp(RC_CORE.x, to.x, reach), y: lerp(RC_CORE.y, to.y, reach) },
          lerp(...RC_BEAM, c) + RC_FLARE_BEAM * flare,
          0.5 + 0.5 * c,
        );
      });
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      // glitter pumped down every locked beam, quickening
      order.forEach((bar, k) => {
        if (ms < lockAt(k) + RC_REACH_MS || ms >= critical) return;
        const to = bars[bar];
        for (let i = 0; i < RC_PUMPED; i++) {
          const u =
            ((ms - lockAt(k)) * lerp(...RC_PUMP, c) + i / RC_PUMPED) % 1;
          stampGlimmer(
            ctx,
            lerp(RC_CORE.x, to.x, u),
            lerp(RC_CORE.y, to.y, u),
            26,
            now * 0.004 + i,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
      });
      // glitter orbiting the core, spinning up
      const spin = (ms - RC_IN_MS) * lerp(...RC_SPIN, c);
      for (let i = 0; i < RC_ORBITERS; i++) {
        const a = spin * (i % 2 ? 1 : -1.3) + (i / RC_ORBITERS) * Math.PI * 2;
        const radius = RC_ORBIT + 40 * Math.sin(i * 1.7);
        stampGlimmer(
          ctx,
          RC_CORE.x + Math.cos(a) * radius,
          RC_CORE.y + Math.sin(a) * radius * RC_ORBIT_Y,
          24 + 10 * c,
          now * 0.004 + i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalAlpha = 0.3 + 0.6 * c;
      drawGlow(
        ctx,
        glowStops(COLOR.white),
        RC_CORE.x,
        RC_CORE.y,
        lerp(...RC_CORE_GLOW, c),
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      const pulse = 1 + 0.08 * Math.sin(ms * (0.02 + 0.06 * c));
      drawWisp(
        ctx,
        () => RC_CORE,
        ms,
        now,
        WISP_SIZE * lerp(...RC_CORE_SIZE, c) * pulse,
        c,
      );
    }

    // locking on, critical's races, the core's burst and its own bar's boom
    order.forEach((bar, k) => {
      drawDetonation(ctx, bars[bar], ms - lockAt(k), RC_BLAST * 0.5, now);
      raceSpots(r, bars, bar).forEach((spots, j) => {
        for (const spot of spots)
          drawDetonation(
            ctx,
            spot,
            ms - critical - j * RC_EVERY_MS,
            bar === 0 ? RC_OWN_BLAST : RC_BLAST,
            now,
          );
      });
    });
    drawDetonation(ctx, RC_CORE, ms - coreBurst, RC_CORE_BLAST, now);
    drawDetonation(ctx, bars[0], ms - critical - RC_BOOM_MS, RC_BOOM, now);
  },
  tailMs: RC_TAIL_MS,
  shake: (step) => RC_SHAKES[step] ?? RC_SHAKES[1],
});
