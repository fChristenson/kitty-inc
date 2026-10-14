// Burn Through, a lock crit: an emitter wisp drops over the dark locked
// floor and its aim laser locks onto the floor's middle; a beam fires and
// cuts a ring into it, lap after lap, faster and faster, the cut glowing
// hotter each lap; it burns into the middle, trembling and charging, and
// the cut-out disc blasts out of the floor, which bursts open: its button's
// next taps cost half
import { CONFIG } from "../../../../config";
import { addHalfTaps } from "../../../buttonCrits/buttonBonus";
import { COLOR } from "../../../../palette";
import {
  drawAimLaser,
  drawBeam,
  drawBeamFlare,
} from "../../../../shared/animationStyles/beam";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping into the emitter OVER the floor's middle
const DROP_MS = 200;
const OVER = FLOOR_H * 0.5 + 60;
const EMITTER = WISP_SIZE * 1.6;
// the aim laser locking on over AIM_MS, then LAPS laps of the ring R px
// round, each LAP_MS (quicker each); the cut glows CUT px wide, hotter each
// lap
const AIM_MS = 320;
const R = 130;
const SQUASH = 0.8;
const LAP_MS = [620, 400, 240, 140];
const BEAM = 26;
const FLARE = 46;
const CUT: [number, number] = [8, 20];
const LAP_SHAKE: [number, number] = [0.6, 1.2];
// the burn into the middle, then the disc blasting out over FLY_MS
const BURN_MS = 420;
const BURN_GLOW = 260;
const CLIMAX_SHAKE = 2;
const FLY_MS = 280;
const FLY = 420;
const OPEN_GAP_MS = 40;
const PAY_GAP_MS = 400;
const OPEN_BLAST = 260;
const TAIL_MS = 900;
// shakes by step: unused (the laps shake themselves), the opening, the taps
const SHAKES = [0.2, 2.6, 1];

interface State {
  laps: number[];
  cutEnd: number;
  burn: Charge;
  openAt: number;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const room: Point = { x: 0, y: 0 };
const emitter: Point = { x: 0, y: 0 };
const end: Point = { x: 0, y: 0 };
const atEmitter = () => emitter;

registerFloorCrit("burnThroughCrit", {
  // half-price taps on the floor it opened
  reward(t) {
    addHalfTaps(t.floor, t.count * CONFIG.crit.burnThroughTaps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const laps: number[] = [];
    let t = DROP_MS + AIM_MS;
    for (const ms of LAP_MS) {
      laps.push(t);
      t += ms;
    }
    const burn = planCharge(t, BURN_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const openAt = burn.climaxMs + OPEN_GAP_MS;
    hit(0, openAt, 1);
    hit(0, openAt + PAY_GAP_MS, 2);
    states.set(r, {
      laps,
      cutEnd: t,
      burn,
      openAt,
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { laps, burn } = state;
    room.x = bars[0].x + state.offset.x;
    room.y = bars[0].y + state.offset.y;
    emitter.x = room.x;
    emitter.y = room.y - OVER;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, emitter.x, p),
        lerp(0, emitter.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
      return;
    }
    while (r.kicked < laps.length && ms >= laps[r.kicked] + LAP_MS[r.kicked]) {
      r.shake(lerp(LAP_SHAKE[0], LAP_SHAKE[1], r.kicked / (laps.length - 1)));
      r.kicked++;
    }
    tickCharge(burn, ms, r.shake);
    const opened = ms >= state.openAt;
    // where the beam is on the ring: a lap's share, quicker each lap
    let k = 0;
    while (k < laps.length - 1 && ms >= laps[k + 1]) k++;
    const lap = clamp01((ms - laps[k]) / LAP_MS[k]);
    const cutting = ms >= laps[0] && ms < state.cutEnd;
    const heat = clamp01((ms - laps[0]) / (state.cutEnd - laps[0]));
    // the cut so far: a lap's arc, then the whole ring
    if (ms >= laps[0] && !opened) {
      const swept = k > 0 || !cutting ? Math.PI * 2 : Math.PI * 2 * lap;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.ellipse(
        room.x,
        room.y,
        R,
        R * SQUASH,
        0,
        -Math.PI / 2,
        -Math.PI / 2 + swept,
      );
      ctx.lineWidth = lerp(CUT[0], CUT[1], heat) * 2;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.globalAlpha = 0.5 + 0.5 * heat;
      ctx.stroke();
      ctx.lineWidth = lerp(CUT[0], CUT[1], heat) * 0.7;
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
      ctx.restore();
    }
    if (ms < laps[0]) {
      end.x = room.x;
      end.y = room.y - R * SQUASH;
      drawAimLaser(ctx, emitter, end);
    } else if (cutting) {
      const a = -Math.PI / 2 + Math.PI * 2 * lap;
      end.x = room.x + Math.cos(a) * R;
      end.y = room.y + Math.sin(a) * R * SQUASH;
      drawBeam(ctx, emitter, end, BEAM * (1 + heat), 1);
      drawBeamFlare(ctx, end, FLARE * (1 + heat), 1, now);
    } else if (!opened) {
      // burning into the middle, charging
      const c = chargeAt(burn, ms);
      drawBeam(ctx, emitter, room, BEAM * (1.5 + 2 * c), 1);
      drawBeamFlare(ctx, room, FLARE * (1 + 2 * c), 1, now);
      drawChargeGlow(ctx, room, c, BURN_GLOW, now);
    }
    if (!opened) drawWispHead(ctx, atEmitter, ms, now, EMITTER, heat);
    // the disc blasting out of the floor towards the view, fading
    const fly = clamp01((ms - state.openAt) / FLY_MS);
    if (opened && fly < 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - fly;
      ctx.beginPath();
      const grow = 1 + (FLY / R) * fly * fly;
      ctx.ellipse(
        room.x,
        room.y,
        R * grow,
        R * SQUASH * grow,
        0,
        0,
        Math.PI * 2,
      );
      ctx.lineWidth = CUT[1] * 2 * (1 - fly);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.stroke();
      ctx.restore();
    }
    drawDetonation(ctx, room, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
