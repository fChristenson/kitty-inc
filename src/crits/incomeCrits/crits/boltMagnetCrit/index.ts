// the bolt magnet income crit: bolts crack in from both sides of the screen
// onto the total quick-fire, a blast on every strike, while the number
// crackles below; then one giant bolt joins the two and the number shoots up
// it into the total
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { smoothstep } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

const RISE_MS = 200;
const FIRST_MS = 200;
const STRIKES = 14;
const EVERY_MS = 48;
const BOLT_MS = 110;
// the number's seat, of the way up to the total, and its crackle
const SEAT_AT = 0.3;
const SEAT_FONT = 140;
const BUZZ = 8;
const BUZZ_MS = 30;
// where the bolts come in: past the screen's sides, between these shares of
// the total's height above the middle (negative is below it)
const SIDE_OUT = 40;
const FROM_HIGH = 0.6;
const FROM_LOW = -0.4;
const GIANT_DELAY_MS = 130;
const GIANT_MS = 130;
const GIANT_FADE_MS = 160;
const SLUG_FONT = 80;
const BOLT = 1.2;
const STRIKE = 1.1;
const GIANT_BOLT = 2.6;
const GIANT_STRIKE = 2;
const BLAST = 160;
// shakes by step: a strike, the giant bolt
const SHAKES = [0.7, 2.4];

interface Strike {
  at: number;
  to: Point;
  bolt: Bolt;
}
interface Magnet {
  seat: Point;
  strikes: Strike[];
  giant: Bolt;
  giantAt: number;
  endAt: number;
}
const magnets = new WeakMap<Running, Magnet>();

function planMagnet(to: Point, viewportWidth: number): Magnet {
  const seat = { x: to.x * SEAT_AT, y: to.y * SEAT_AT };
  const strikes: Strike[] = [];
  for (let k = 0; k < STRIKES; k++) {
    const from = {
      x: (k % 2 === 0 ? -1 : 1) * (viewportWidth / 2 + SIDE_OUT),
      y: lerp(to.y * FROM_HIGH, to.y * FROM_LOW, holeHash(k, 71)),
    };
    const spot = readoutSpot(to, k, 72);
    strikes.push({
      at: FIRST_MS + k * EVERY_MS,
      to: spot,
      bolt: createBolt(from, spot, 2),
    });
  }
  const giantAt = strikes[STRIKES - 1].at + GIANT_DELAY_MS;
  return {
    seat,
    strikes,
    giant: createBolt(seat, to, 3),
    giantAt,
    endAt: giantAt + GIANT_MS,
  };
}

registerFloorCrit("boltMagnetCrit", {
  plan(r, bars, hit) {
    const magnet = planMagnet(bars[0], r.viewportWidth);
    magnets.set(r, magnet);
    for (const s of magnet.strikes) hit(0, s.at);
    hit(0, magnet.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const magnet = magnets.get(r);
    if (!magnet) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { seat, strikes, giantAt, endAt } = magnet;
    for (let k = 0; k < strikes.length; k++) {
      const s = strikes[k];
      const dt = ms - s.at;
      if (dt >= 0 && dt < BOLT_MS) {
        const fade = 1 - dt / BOLT_MS;
        drawBolt(ctx, s.bolt, fade, BOLT);
        drawStrike(ctx, s.to, fade, STRIKE, now);
      }
      drawDetonation(ctx, s.to, dt, BLAST, now);
    }
    if (ms >= giantAt && ms < endAt + GIANT_FADE_MS) {
      const fade = 1 - clamp01((ms - endAt) / GIANT_FADE_MS);
      drawBolt(ctx, magnet.giant, fade, GIANT_BOLT);
      if (ms >= endAt) drawStrike(ctx, to, fade, GIANT_STRIKE, now);
    }
    if (ms < giantAt) {
      const u = smoothstep(clamp01(ms / RISE_MS));
      const buzz =
        ms >= FIRST_MS
          ? (holeHash(Math.floor(ms / BUZZ_MS), 73) * 2 - 1) * BUZZ
          : 0;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        seat.x * u + buzz,
        seat.y * u,
        lerp(r.flashFont, SEAT_FONT, u),
      );
    } else if (ms < endAt) {
      const p = ((ms - giantAt) / GIANT_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(seat.x, to.x, p),
        lerp(seat.y, to.y, p),
        lerp(SEAT_FONT, SLUG_FONT, p),
      );
    }
    drawFinale(ctx, to, ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
