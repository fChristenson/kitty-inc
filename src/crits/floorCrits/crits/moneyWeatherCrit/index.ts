// the money weather floor crit: the number shoots up into the sky and coins
// start raining over the bars in view, a drizzle thickening to a slanting
// downpour, heavy coins slamming into the bars quicker and quicker, then a
// storm, lightning arcs firing from the top right with them; one huge coin
// drops out of the sky onto its own bar on a giant arc in a huge blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawStrike } from "../../../../shared/animationStyles/lightning";
import { drawLightningArc } from "../../../../shared/animationStyles/lightningArc";
import { clamp01 } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { groundY, holeHash, skyY } from "../../critPlayer/shared";

const MW_IN_MS = 220;
// the rain: drops start over MW_RAIN_MS, thicker and thicker, falling faster
// and slanting harder (of the viewport's width) as it pours
const MW_RAIN_FROM_MS = 120;
const MW_RAIN_MS = 1500;
const MW_DROPS = 170;
const MW_FALL_MS: [number, number] = [560, 380];
const MW_SLANT: [number, number] = [0.04, 0.24];
const MW_DROP: [number, number] = [20, 32];
const MW_SPREAD = 1.3;
const MW_SPIN = 0.02;
const MW_ABOVE = 700;
const MW_BELOW = 500;
// heavy coins slamming the bars, quicker and quicker
const MW_IMPACTS = 14;
const MW_FIRST_MS = 420;
const MW_GAP_MS: [number, number] = [120, 45];
const MW_IMPACT_FALL_MS = 180;
const MW_IMPACT_LEAN = 0.08;
const MW_IMPACT_COIN = 46;
const MW_BLAST = 130;
// the storm: from impact MW_STORM_FROM on, each lands on a lightning arc
// fired from the top right (MW_ARC_SIDE of the width right of the middle)
// over MW_ARC_FIRE_MS, the sky flashing with it
const MW_STORM_FROM = 5;
const MW_ARC_SIDE = 0.5;
const MW_ARC_FIRE_MS = 60;
const MW_BOLT_MS = 160;
const MW_BOLT = 1;
const MW_FLASH = 0.15;
const MW_BIG_BOLT = 2.6;
const MW_BIG_STRIKE = 2;
const MW_BIG_FLASH = 0.5;
const MW_BIG_FLASH_MS = 300;
// the huge coin, falling from the sky onto its own bar
const MW_BIG_DELAY_MS = 160;
const MW_BIG_FALL_MS = 280;
const MW_BIG_COIN = 120;
const MW_BOOM = 440;
const MW_CLUSTER = [-0.5, 0.5, -1, 1];
const MW_CLUSTER_MS = 45;
const MW_CLUSTER_BLAST = 170;
const MW_KICKED_BOOM = 1e6;
// shakes by step: an impact, the huge coin
const MW_SHAKES = [0.6, 3];
const MW_TAIL_MS = 1000;

interface Drop {
  at: number;
  fallMs: number;
  // where it starts across and how far it drifts, of the viewport's width
  x: number;
  slant: number;
  size: number;
}
interface Impact {
  bar: number;
  side: number;
  at: number;
}
interface Weather {
  drops: Drop[];
  impacts: Impact[];
  boom: number;
}
const weathers = new WeakMap<Running, Weather>();
const sprite: CoinBurstSprite = { kind: "coin", spinFrame: 0, axisAngle: 0 };
const spot: Point = { x: 0, y: 0 };
const corner: Point = { x: 0, y: 0 };

function planWeather(bars: Point[]): Weather {
  const drops: Drop[] = [];
  for (let i = 0; i < MW_DROPS; i++) {
    const u = Math.sqrt(i / MW_DROPS);
    drops.push({
      at: MW_RAIN_FROM_MS + MW_RAIN_MS * u,
      fallMs: lerp(...MW_FALL_MS, u),
      x: (holeHash(i, 1210) - 0.5) * MW_SPREAD + lerp(...MW_SLANT, u) / 2,
      slant: lerp(...MW_SLANT, u),
      size: lerp(...MW_DROP, holeHash(i, 1211)),
    });
  }
  const impacts: Impact[] = [];
  let clock = MW_FIRST_MS;
  for (let k = 0; k < MW_IMPACTS; k++) {
    impacts.push({
      bar: Math.floor(holeHash(k, 1212) * bars.length),
      side: holeHash(k, 1213) * 2 - 1,
      at: clock,
    });
    clock += lerp(...MW_GAP_MS, k / (MW_IMPACTS - 1));
  }
  const boom = impacts[MW_IMPACTS - 1].at + MW_BIG_DELAY_MS;
  return { drops, impacts, boom };
}

registerFloorCrit("moneyWeatherCrit", {
  plan(r, bars, hit) {
    const weather = planWeather(bars);
    weathers.set(r, weather);
    for (const i of weather.impacts) hit(i.bar, i.at, 0);
    hit(0, weather.boom, 1);
    for (let k = 0; k < MW_CLUSTER.length; k++)
      hit(0, weather.boom + (k + 1) * MW_CLUSTER_MS, 0);
  },
  draw(ctx, r, ms, bars) {
    const weather = weathers.get(r);
    if (!weather) return;
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const sky = skyY(r, bars, MW_ABOVE);
    const ground = groundY(r, bars, MW_BELOW);
    const { drops, impacts, boom } = weather;
    if (ms < MW_IN_MS) {
      const p = (ms / MW_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, sky, p), r.flashFont, {
        alpha: 1 - p,
      });
    }
    if (ms >= boom && r.kicked < MW_KICKED_BOOM) {
      r.kicked = MW_KICKED_BOOM;
      playExplosion();
    }

    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    // the rain, its drops sorted by when they start
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const t = (ms - d.at) / d.fallMs;
      if (t < 0) break;
      if (t >= 1) continue;
      sprite.spinFrame = ms * MW_SPIN + i;
      drawCoinBurstFrame(
        ctx,
        sprite,
        (d.x - d.slant * t) * w,
        lerp(sky, ground, t),
        d.size,
        base,
      );
    }
    // the heavy coins, each dropping onto its bar
    for (let k = 0; k < impacts.length; k++) {
      const i = impacts[k];
      const t = 1 - (i.at - ms) / MW_IMPACT_FALL_MS;
      if (t < 0 || t >= 1) continue;
      const to = along(r, bars, i.bar, i.side);
      sprite.spinFrame = ms * MW_SPIN + k;
      drawCoinBurstFrame(
        ctx,
        sprite,
        to.x + MW_IMPACT_LEAN * w * (1 - t),
        lerp(sky, to.y, t * t),
        MW_IMPACT_COIN,
        base,
      );
    }
    // the huge coin onto its own bar
    const big = 1 - (boom - ms) / MW_BIG_FALL_MS;
    if (big >= 0 && big < 1) {
      sprite.spinFrame = ms * MW_SPIN;
      drawCoinBurstFrame(
        ctx,
        sprite,
        bars[0].x,
        lerp(sky, bars[0].y, big * big),
        MW_BIG_COIN,
        base,
      );
    }
    endCoinBatch(ctx);

    // the sky lighting up with every strike
    let flash = 0;
    for (let k = MW_STORM_FROM; k < impacts.length; k++) {
      const dt = ms - impacts[k].at;
      if (dt >= 0 && dt < MW_BOLT_MS)
        flash = Math.max(flash, MW_FLASH * (1 - dt / MW_BOLT_MS));
    }
    const bigDt = ms - boom;
    if (bigDt >= 0 && bigDt < MW_BIG_FLASH_MS)
      flash = Math.max(flash, MW_BIG_FLASH * (1 - bigDt / MW_BIG_FLASH_MS));
    if (flash > 0) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = flash;
      drawGlow(ctx, glowStops(COLOR.white), 0, 0, w);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    // the arcs firing from the top right onto the bars with the heavy coins,
    // and the giant one, in one light batch, then their strikes
    corner.x = w * MW_ARC_SIDE;
    corner.y = skyY(r, bars, Infinity);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = MW_STORM_FROM; k < impacts.length; k++) {
      const i = impacts[k];
      const dt = ms - i.at;
      if (dt < -MW_ARC_FIRE_MS || dt >= MW_BOLT_MS) continue;
      drawLightningArc(
        ctx,
        corner,
        along(r, bars, i.bar, i.side),
        dt < 0 ? 1 : 1 - dt / MW_BOLT_MS,
        MW_BOLT,
        now,
        k,
        clamp01(1 + dt / MW_ARC_FIRE_MS),
      );
    }
    const bigOn = bigDt >= 0 && bigDt < MW_BIG_FLASH_MS;
    const bigFade = 1 - bigDt / MW_BIG_FLASH_MS;
    if (bigDt >= -MW_ARC_FIRE_MS && bigDt < MW_BIG_FLASH_MS)
      drawLightningArc(
        ctx,
        corner,
        bars[0],
        bigDt < 0 ? 1 : bigFade,
        MW_BIG_BOLT,
        now,
        MW_IMPACTS,
        clamp01(1 + bigDt / MW_ARC_FIRE_MS),
      );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = MW_STORM_FROM; k < impacts.length; k++) {
      const dt = ms - impacts[k].at;
      if (dt < 0 || dt >= MW_BOLT_MS) continue;
      const to = along(r, bars, impacts[k].bar, impacts[k].side);
      drawStrike(ctx, to, 1 - dt / MW_BOLT_MS, 1, now);
    }
    if (bigOn) drawStrike(ctx, bars[0], bigFade, MW_BIG_STRIKE, now);

    for (let k = 0; k < impacts.length; k++) {
      const i = impacts[k];
      const to = along(r, bars, i.bar, i.side);
      drawDetonation(ctx, to, ms - i.at, MW_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - boom, MW_BOOM, now);
    for (let k = 0; k < MW_CLUSTER.length; k++) {
      const at = along(r, bars, 0, MW_CLUSTER[k]);
      spot.x = at.x;
      spot.y = at.y;
      drawDetonation(
        ctx,
        spot,
        ms - boom - (k + 1) * MW_CLUSTER_MS,
        MW_CLUSTER_BLAST,
        now,
      );
    }
  },
  tailMs: MW_TAIL_MS,
  shake: (step) => MW_SHAKES[step] ?? MW_SHAKES[0],
});
