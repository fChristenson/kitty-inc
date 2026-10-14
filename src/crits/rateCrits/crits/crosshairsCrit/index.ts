// Crosshairs, a rate crit: a turret wisp at the screen's edge by its own bar
// scans an aim laser up and down the building, faster and faster, a reticle
// snapping onto every bar's readout as it crosses; it charges, trembling and
// glowing, light racing in, then fires every beam at once: each bar's next
// payout pays five times, its own ten
import { defineBarEffect } from "../../rateBonus";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  drawAimLaser,
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { bottomBarY, topBarY } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the turret IN from the screen's right edge; the laser's end AIM_PAST the
// bars' left ends, sweeping SWEEP_PAST above the top bar and below the
// lowest over SCAN_MS, quickening (SCAN_TURNS laps of half a sweep, SCAN_RUSH
// more by its end)
const IN = 70;
const AIM_PAST = 30;
const SWEEP_PAST = 90;
const SCAN_MS = 1200;
const SCAN_TURNS = 1.4;
const SCAN_RUSH = 3.6;
const SCAN_STEP = 4;
// a reticle snapping in from RETICLE[0] to [1] px round over SNAP_MS
const RETICLE: [number, number] = [170, 80];
const SNAP_MS = 120;
const RETICLE_WOBBLE = 6;
const TICK_IN = 10;
const TICK_OUT = 50;
const RETICLE_WIDTH = 12;
const LINK_WIDTH = 6;
const LINK_ALPHA = 0.4;
// the charge, then the beams
const CHARGE_MS = 700;
const CLIMAX_SHAKE = 2.6;
const TREMBLE = 16;
const STREAKS = 300;
const GLOW = 300;
const BEAM_MS = 350;
const BEAM = 90;
const OWN_BEAM = 140;
const OWN_FLARE = 130;
const BLAST = 150;
const OWN_BLAST = 260;
const WISP = WISP_SIZE;
const TAIL_MS = 1000;
// shakes by step: a lock, a bar's beam, its own
const SHAKES = [0.4, 0.8, 1.6];

interface Lock {
  bar: number;
  at: number;
}
interface State {
  locks: Lock[];
  charge: Charge;
  scanAt: number;
}
const states = new WeakMap<Running, State>();
const turret: Point = { x: 0, y: 0 };
const aim: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };

// the sweep's share 0..1 down from above the top bar at ms into the scan
const sweepAt = (ms: number) => {
  const s = clamp01(ms / SCAN_MS);
  return 0.5 - 0.5 * Math.cos(Math.PI * (SCAN_TURNS * s + SCAN_RUSH * s * s));
};

// a lock: how many times as big the bar's next payout pays
const aimed = defineBarEffect<number>({
  payout: (times) => times,
  onPayout: () => undefined,
});

registerFloorCrit("crosshairsCrit", {
  // the next payout five times as big, its own ten
  reward(t) {
    const times = t.own
      ? CONFIG.crit.crosshairsOwnPayout
      : CONFIG.crit.crosshairsPayout;
    aimed.set(t.floor, (aimed.get(t.floor) ?? 1) * times);
  },
  plan(r, bars, hit) {
    const top = topBarY(bars) - SWEEP_PAST;
    const span = bottomBarY(bars) + SWEEP_PAST - top;
    const scanAt = IN_MS;
    // each bar locks the first time the laser crosses it, its own the last
    const locks = bars.map((bar, i) => {
      const share = (bar.y - top) / span;
      let at = SCAN_MS;
      let previous = sweepAt(0);
      for (let m = SCAN_STEP; m <= SCAN_MS; m += SCAN_STEP) {
        const now = sweepAt(m);
        if ((previous - share) * (now - share) <= 0) {
          at = m;
          if (i !== 0) break;
        }
        previous = now;
      }
      return { bar: i, at: scanAt + at };
    });
    const charge = planCharge(scanAt + SCAN_MS, CHARGE_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    for (const lock of locks) hit(lock.bar, lock.at, 0);
    for (const lock of locks) hit(lock.bar, charge.climaxMs, lock.bar ? 1 : 2);
    states.set(r, { locks, charge, scanAt });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const fire = state.charge.climaxMs;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCharge(state.charge, ms, r.shake);
    turret.x = r.viewportWidth / 2 - IN;
    turret.y = bars[0].y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const scan = ms - state.scanAt;
    if (scan >= 0 && scan < SCAN_MS) {
      const top = topBarY(bars) - SWEEP_PAST;
      aim.x = bars[0].x - r.play.barHalfWidth - AIM_PAST;
      aim.y = top + (bottomBarY(bars) + SWEEP_PAST - top) * sweepAt(scan);
      drawAimLaser(ctx, turret, aim);
    }
    if (ms <= fire + 60) {
      ctx.lineWidth = RETICLE_WIDTH;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.beginPath();
      for (const lock of state.locks) {
        if (ms < lock.at) continue;
        const at = bars[lock.bar];
        const radius =
          lerp(RETICLE[0], RETICLE[1], clamp01((ms - lock.at) / SNAP_MS)) +
          RETICLE_WOBBLE * Math.sin(ms * 0.03 + lock.bar);
        drawBeam(ctx, turret, at, LINK_WIDTH, LINK_ALPHA);
        ctx.moveTo(at.x + radius, at.y);
        ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
        for (let k = 0; k < 4; k++) {
          const cos = k === 0 ? 1 : k === 2 ? -1 : 0;
          const sin = k === 1 ? 1 : k === 3 ? -1 : 0;
          ctx.moveTo(
            at.x + cos * (radius + TICK_IN),
            at.y + sin * (radius + TICK_IN),
          );
          ctx.lineTo(
            at.x + cos * (radius + TICK_OUT),
            at.y + sin * (radius + TICK_OUT),
          );
        }
      }
      ctx.stroke();
    }
    const fade = 1 - clamp01((ms - fire) / BEAM_MS);
    if (ms >= fire && fade > 0) {
      for (const lock of state.locks)
        drawBeam(ctx, turret, bars[lock.bar], lock.bar ? BEAM : OWN_BEAM, fade);
      drawBeamFlare(ctx, bars[0], OWN_FLARE, fade, now);
    }
    ctx.restore();
    if (ms >= state.charge.startMs && ms < fire) {
      const c = chargeAt(state.charge, ms);
      trembleAt(c, ms, TREMBLE, shiver);
      head.x = turret.x + shiver.x;
      head.y = turret.y + shiver.y;
      drawChargeStreaks(ctx, turret, c, STREAKS, ms);
      drawChargeGlow(ctx, head, c, GLOW, now);
      drawWispHead(ctx, () => head, ms, now, WISP * (1 + c), c);
    } else if (ms >= IN_MS && ms < fire) {
      head.x = turret.x;
      head.y = turret.y;
      drawWispHead(ctx, () => head, ms, now, WISP, 0.4);
    }
    for (const lock of state.locks)
      drawDetonation(
        ctx,
        bars[lock.bar],
        ms - fire,
        lock.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
