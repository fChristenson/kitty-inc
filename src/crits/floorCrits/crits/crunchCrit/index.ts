// the crunch floor crit: the number turns into a gravity well in the middle of
// the screen that hauls every bar in view off its floor into one tight stack,
// the nearest crunching in first; the stack squeezes smaller, rattling and
// flashing harder, until the well bursts and flings the bars back out, each
// slamming onto its floor in a rattle of blasts, its own bar last and hardest
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { smoothstep } from "../../../../shared/easing";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const CR_IN_MS = 260;
const CR_PULL_AT = CR_IN_MS + 100;
const CR_PULL_MS = 520;
// the farthest bar crunches in this long after the nearest
const CR_STAGGER_MS = 110;
const CR_SQUEEZE_AT = CR_PULL_AT + CR_PULL_MS + CR_STAGGER_MS;
const CR_SQUEEZE_MS = 520;
const CR_BURST = CR_SQUEEZE_AT + CR_SQUEEZE_MS;
// the stack: bars this far apart, shrunk to this, squeezed this much more
const CR_GAP = 56;
const CR_SCALE = 0.55;
const CR_SQUEEZE = 0.1;
const CR_SQUEEZE_X = 0.15;
const CR_RATTLE = 18;
const CR_FLASH = 0.4;
// flung back out: the flight's length by distance, its own bar this much later
const CR_FLY_MS = 160;
const CR_FLY_PER_PX = 0.18;
const CR_OWN_LATE_MS = 120;
const CR_LAND_BLASTS = 3;
const CR_OWN_BLASTS = 6;
const CR_EVERY_MS = 45;
// the well and the glitter it hauls in
const CR_WELL = 2.4;
const CR_WELL_GLOW = 420;
const CR_STREAM = 40;
const CR_STREAM_REACH = 0.7;
const CR_STREAM_SIZE = 30;
// blasts: crunching in, the burst, landing, its own bar's run and last one
const CR_CRUNCH = 150;
const CR_CRUNCH_FAR = 190;
const CR_BURST_BLAST = 380;
const CR_LAND = 140;
const CR_OWN_LAND = 170;
const CR_BOOM = 420;
const CR_CREAK_MS = 80;
const CR_CREAK: [number, number] = [0.3, 0.9];
const CR_BURST_SHAKE = 2.2;
const CR_KICKED_BURST = 1e6;
// shakes by step: crunching in, a landing blast, the last one
const CR_SHAKES = [1.2, 1, 3];
const CR_TAIL_MS = 1100;

interface Crunch {
  well: Point;
  // each bar's place in the stack (from the well), crunch and landing
  slot: number[];
  arrive: number[];
  fly: number[];
  land: number[];
  // the last landing, when its own bar's run starts
  last: number;
  boom: number;
}
const crunches = new WeakMap<Running, Crunch>();
const hidden = new WeakSet<Running>();

function planCrunch(bars: Point[]): Crunch {
  const well = { x: bars[0].x, y: 0 };
  const order = byHeight(bars);
  const slot: number[] = [];
  order.forEach((bar, k) => {
    slot[bar] = (k - (order.length - 1) / 2) * CR_GAP;
  });
  const dist = bars.map((b, i) => Math.abs(slot[i] - b.y));
  const far = Math.max(1, ...dist);
  const arrive = dist.map(
    (d) => CR_PULL_AT + CR_PULL_MS + CR_STAGGER_MS * (d / far),
  );
  const fly = dist.map((d) => CR_FLY_MS + CR_FLY_PER_PX * d);
  const land = fly.map((f) => CR_BURST + f);
  const others = land.filter((_, i) => i !== 0);
  if (others.length) land[0] = Math.max(land[0], ...others) + CR_OWN_LATE_MS;
  const last = land[0];
  return {
    well,
    slot,
    arrive,
    fly,
    land,
    last,
    boom: last + CR_OWN_BLASTS * CR_EVERY_MS,
  };
}

// a landing blast j along a bar
const landSpot = (
  r: Running,
  bars: Point[],
  bar: number,
  j: number,
  n: number,
) => {
  const at = along(r, bars, bar, (j / (n - 1)) * 2 - 1);
  at.y += j % 2 ? -25 : 20;
  return at;
};

registerFloorCrit("crunchCrit", {
  plan(r, bars, hit) {
    const c = planCrunch(bars);
    crunches.set(r, c);
    bars.forEach((_, bar) => {
      hit(bar, c.arrive[bar], 0);
      const n = bar === 0 ? CR_OWN_BLASTS : CR_LAND_BLASTS;
      for (let j = 0; j < n; j++) hit(bar, c.land[bar] + j * CR_EVERY_MS, 1);
    });
    hit(0, c.boom, 2);
  },
  draw(ctx, r, ms, bars) {
    const c = crunches.get(r);
    if (!c) return;
    const now = r.startedAt + ms;
    const { well } = c;
    if (ms < CR_IN_MS) {
      const p = smoothstep(ms / CR_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        well.x * p,
        well.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // the well, glowing through the stack it hauls in
    const squeeze = clamp01((ms - CR_SQUEEZE_AT) / CR_SQUEEZE_MS);
    if (ms >= CR_IN_MS && ms < CR_BURST) {
      const grow = clamp01((ms - CR_IN_MS) / 200);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35 + 0.5 * squeeze;
      drawGlow(
        ctx,
        glowStops(COLOR.heavenlyGold),
        well.x,
        well.y,
        CR_WELL_GLOW * grow,
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      drawWisp(ctx, () => well, ms, now, WISP_SIZE * CR_WELL * grow, squeeze);
    }

    // the creaks building as it squeezes, then the burst
    if (ms >= CR_SQUEEZE_AT && ms < CR_BURST) {
      const due = Math.floor((ms - CR_SQUEEZE_AT) / CR_CREAK_MS) + 1;
      while (r.kicked < due) {
        r.kicked++;
        r.shake(lerp(...CR_CREAK, squeeze));
      }
    }
    if (ms >= CR_BURST && r.kicked < CR_KICKED_BURST) {
      r.kicked = CR_KICKED_BURST;
      r.shake(CR_BURST_SHAKE);
      playExplosion();
    }

    // the bars, hauled off their floors and drawn here till they land
    const flying = ms >= CR_PULL_AT && ms < c.last;
    if (flying && !hidden.has(r)) {
      hidden.add(r);
      r.play.hideBars?.(bars.map((_, i) => i));
    } else if (!flying && hidden.has(r)) {
      hidden.delete(r);
      r.play.hideBars?.(null);
    }
    if (flying && r.play.drawBar) {
      const jitter = Math.floor(ms / 30);
      bars.forEach((home, bar) => {
        if (ms >= c.land[bar]) {
          r.play.drawBar!(ctx, bar, 0);
          return;
        }
        const k =
          ms < CR_BURST
            ? clamp01((ms - CR_PULL_AT) / (c.arrive[bar] - CR_PULL_AT)) ** 2.5
            : 1 - clamp01((ms - CR_BURST) / c.fly[bar]) ** 1.6;
        const crunched = ms >= c.arrive[bar] && ms < CR_BURST;
        const flash = crunched
          ? Math.max(
              1 - (ms - c.arrive[bar]) / 160,
              CR_FLASH * squeeze * (0.6 + 0.4 * Math.sin(ms * 0.06)),
            )
          : 0;
        const pressed = crunched ? squeeze : 0;
        const s = lerp(1, CR_SCALE, k) * (1 - CR_SQUEEZE * pressed);
        ctx.save();
        ctx.translate(
          lerp(home.x, well.x, k) +
            (holeHash(jitter, bar) - 0.5) * CR_RATTLE * pressed,
          lerp(home.y, well.y + c.slot[bar], k),
        );
        ctx.scale(s * (1 - CR_SQUEEZE_X * pressed), s);
        r.play.drawBar!(ctx, bar, Math.max(0, flash));
        ctx.restore();
      });
    }

    // glitter streaming into the well as it hauls
    if (ms >= CR_PULL_AT && ms < CR_SQUEEZE_AT) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      const reach = r.viewportWidth * CR_STREAM_REACH;
      for (let i = 0; i < CR_STREAM; i++) {
        const u = ((ms - CR_PULL_AT) * 0.002 + holeHash(i, 70)) % 1;
        const a = holeHash(i, 71) * Math.PI * 2;
        const d = (1 - u) * reach;
        stampGlimmer(
          ctx,
          well.x + Math.cos(a) * d,
          well.y + Math.sin(a) * d * 0.8,
          CR_STREAM_SIZE * u,
          now * 0.004 + i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
    }

    // crunching in, the burst, and every landing
    bars.forEach((_, bar) => {
      const far = c.arrive[bar] > CR_PULL_AT + CR_PULL_MS + CR_STAGGER_MS / 2;
      drawDetonation(
        ctx,
        { x: well.x, y: well.y + c.slot[bar] },
        ms - c.arrive[bar],
        far ? CR_CRUNCH_FAR : CR_CRUNCH,
        now,
      );
      const n = bar === 0 ? CR_OWN_BLASTS : CR_LAND_BLASTS;
      for (let j = 0; j < n; j++)
        drawDetonation(
          ctx,
          landSpot(r, bars, bar, j, n),
          ms - c.land[bar] - j * CR_EVERY_MS,
          bar === 0 ? CR_OWN_LAND : CR_LAND,
          now,
        );
    });
    drawDetonation(ctx, well, ms - CR_BURST, CR_BURST_BLAST, now);
    drawDetonation(ctx, bars[0], ms - c.boom, CR_BOOM, now);
  },
  tailMs: CR_TAIL_MS,
  shake: (step) => CR_SHAKES[step] ?? CR_SHAKES[1],
});
