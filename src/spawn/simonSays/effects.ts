// what a Simon says game plays: its sequence's right taps one by one, then
// the reward it pays once the sequence is done, played by tapping the
// bars. Add an effect here and it joins the draw
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  CRIT_TIER_CONFIG,
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
  type CritTier,
} from "../../crits";
import { getIncomeBarBox } from "../../floors";
import type { Floor } from "../../gameState";
import { playJackpot } from "../../sound";
import { drawBeam } from "../../shared/animationStyles/beam";
import { clamp01 } from "../../shared/easing";
import { drawDetonation } from "../../shared/animationStyles/explosion";
import { playBarExplosion, playExplosion } from "../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import { shakeScreen } from "../../shared/screenShake";
import {
  barFloorsInView,
  barOnScreen,
  giveLevels,
  payTotal,
  spawnGameDeps,
} from "../../shared/spawnGames";
import type { Point } from "../../shared/wisp";

export interface SimonEffect {
  // the k-th right tap of the n in the sequence, on floor's bar
  step(k: number, n: number, floor: Floor, now: number): void;
  // the sequence is done: the reward starts
  start(now: number): void;
  // a tap on floor's bar while the reward plays; false once it's over
  tap(floor: Floor, now: number): boolean;
  // its frame (screen units); false once there's nothing left to show
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    totalAtY: number,
    now: number,
  ): boolean;
}

// fever: every right tap pops a crit number off its bar in a blast; the
// last tips the game into fever: a huge blast, every bar in view pours gold,
// light streaks rush over the screen, and a rush of hits blows
// bar after bar, fountaining coins into the total (the player's own taps
// adding more), until one huge blast ends it
const FV_POP_MS = 600;
const FV_POP_RISE = 150;
const FV_POP_ACROSS = -260;
const FV_POP_LIFT = 90;
const FV_POP_FONT = 70;
const FV_POP_STROKE = 12;
const FV_POP_RES = 2;
const FV_POP_FADE_MS = 150;
const FV_STEP_BLAST = 60;
const FV_STEP_SHAKE = 0.6;
const FV_RUSH = 12;
const FV_RUSH_FROM_MS = 150;
const FV_RUSH_GAP_MS = 110;
const FV_MS = FV_RUSH_FROM_MS + (FV_RUSH - 1) * FV_RUSH_GAP_MS + 250;
const FV_START_BLAST = 300;
const FV_START_SHAKE = 2.4;
const FV_POUR_MS = 300;
const FV_GOLD_ALPHA = 0.85;
const FV_GLOSS = 0.5;
const FV_COOL_MS = 400;
const FV_STREAKS = 36;
const FV_STREAK_REACH = 1400;
const FV_STREAK_LEN = 160;
const FV_STREAK_SPEED = 1.8;
const FV_STREAK_WIDTH = 12;
const FV_STREAK_ALPHA = 0.45;
const FV_RATTLE = [-0.8, -0.4, 0, 0.4, 0.8];
const FV_RATTLE_MS = 45;
const FV_BLOW_BLAST = 90;
const FV_BLOW_SHAKE = 1.2;
const FV_BLOW_COINS: [number, number] = [14, 18];
const FV_BLOW_GLOW = 420;
const FV_BLOW_GLOW_ALPHA = 0.7;
const FV_BLOW_GLOW_MS = 300;
// the share of rewardSeconds the blows pay between them (about
// FV_BLOWS_EXPECTED of them), the rest paid at the end
const FV_BLOWS_SHARE = 0.4;
const FV_BLOWS_EXPECTED = 16;
const FV_END_BLAST = 340;
const FV_END_COINS: [number, number] = [60, 70];
const FV_RING = 6;
const FV_RING_R = 260;
const FV_RING_MS = 45;
const FV_RING_BLAST = 110;
const FV_FLASH_MS = 400;
const FV_FLASH = 600;
const FV_FLASH_ALPHA = 0.6;
const FV_END_SHAKE = 3;
const FV_LINGER_MS = 1500;
const WHITE = fadeStops(COLOR.white);
const GOLD = fadeStops(COLOR.heavenlyGold);

const popSprites = new Map<CritTier, CritTextSprite>();
function popSprite(tier: CritTier): CritTextSprite {
  let s = popSprites.get(tier);
  if (!s) {
    const { label, color } = CRIT_TIER_CONFIG[tier];
    s = createCritTextSprite(
      label,
      color,
      { fontSize: FV_POP_FONT, strokeWidth: FV_POP_STROKE },
      FV_POP_RES,
    );
    popSprites.set(tier, s);
  }
  return s;
}

function createFever(): SimonEffect {
  const pops: { floor: Floor; at: number; tier: CritTier }[] = [];
  const taps: { floor: Floor; at: number }[] = [];
  let feverAt = -1;
  let boomAt = -1;
  let rushed = 0;
  const bar: Point = { x: 0, y: 0 };
  const spot: Point = { x: 0, y: 0 };
  const middle: Point = { x: 0, y: 0 };
  const from: Point = { x: 0, y: 0 };
  const to: Point = { x: 0, y: 0 };
  popSprite("crit");
  popSprite("mega");

  function boom(now: number): void {
    boomAt = now;
    const deps = spawnGameDeps();
    if (deps)
      payTotal(
        deps,
        CONFIG.randomSpawns.simonSays.rewardSeconds * (1 - FV_BLOWS_SHARE),
        middle,
        FV_END_COINS,
      );
    shakeScreen(FV_END_SHAKE);
    playExplosion();
    playJackpot();
  }

  // floor's bar hit: it blows, fountaining coins into the total
  function blow(floor: Floor, now: number): void {
    const deps = spawnGameDeps();
    taps.push({ floor, at: now });
    if (deps) {
      giveLevels(
        deps,
        floor,
        CONFIG.randomSpawns.simonSays.levels,
        COLOR.heavenlyGold,
      );
      if (barOnScreen(deps, floor, bar))
        payTotal(
          deps,
          (CONFIG.randomSpawns.simonSays.rewardSeconds * FV_BLOWS_SHARE) /
            FV_BLOWS_EXPECTED,
          bar,
          FV_BLOW_COINS,
        );
    }
    shakeScreen(FV_BLOW_SHAKE);
    playBarExplosion(1.5);
  }

  // the rush's presses due by now, bar after bar in view
  function rush(now: number): void {
    const deps = spawnGameDeps();
    if (!deps) return;
    while (
      rushed < FV_RUSH &&
      now >= feverAt + FV_RUSH_FROM_MS + rushed * FV_RUSH_GAP_MS
    ) {
      const floors = barFloorsInView(deps);
      if (floors.length) blow(floors[(rushed * 3 + 1) % floors.length], now);
      rushed++;
    }
  }

  // the bars in view poured gold from their left ends, `pour` (0..1) along
  function drawGoldBars(
    ctx: CanvasRenderingContext2D,
    pour: number,
    alpha: number,
  ): void {
    const deps = spawnGameDeps();
    if (!deps || pour <= 0 || alpha <= 0) return;
    for (const floor of barFloorsInView(deps)) {
      if (!barOnScreen(deps, floor, bar)) continue;
      const box = getIncomeBarBox(deps.floors.indexOf(floor) === 0);
      const left = bar.x - box.width / 2;
      const top = bar.y - box.height / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(left, top, box.width, box.height, box.radius);
      ctx.clip();
      ctx.globalAlpha = FV_GOLD_ALPHA * alpha;
      ctx.fillStyle = COLOR.heavenlyGold;
      ctx.fillRect(left, top, box.width * pour, box.height);
      ctx.globalAlpha = FV_GLOSS * alpha;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(
        left,
        top + box.height * 0.12,
        box.width * pour,
        box.height * 0.18,
      );
      ctx.restore();
    }
  }

  // light streaks rushing out from the middle, in one light batch
  function drawStreaks(
    ctx: CanvasRenderingContext2D,
    alpha: number,
    now: number,
  ): void {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < FV_STREAKS; i++) {
      const a = (i / FV_STREAKS) * Math.PI * 2 + i * 0.61;
      const d = 120 + ((now * FV_STREAK_SPEED + i * 173) % FV_STREAK_REACH);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      from.x = middle.x + cos * d;
      from.y = middle.y + sin * d;
      to.x = middle.x + cos * (d + FV_STREAK_LEN);
      to.y = middle.y + sin * (d + FV_STREAK_LEN);
      drawBeam(ctx, from, to, FV_STREAK_WIDTH, alpha * FV_STREAK_ALPHA);
    }
    endLightBatch(ctx);
    ctx.restore();
  }

  return {
    step(k, n, floor, now) {
      const deps = spawnGameDeps();
      pops.push({ floor, at: now, tier: k === n - 1 ? "mega" : "crit" });
      if (deps)
        giveLevels(
          deps,
          floor,
          CONFIG.randomSpawns.simonSays.levels,
          COLOR.heavenlyGold,
        );
      shakeScreen(FV_STEP_SHAKE);
      playBarExplosion(1 + k / n);
    },
    start(now) {
      feverAt = now;
      shakeScreen(FV_START_SHAKE);
      playExplosion();
      playJackpot();
    },
    tap(floor, now) {
      if (feverAt < 0 || boomAt >= 0) return false;
      blow(floor, now);
      return true;
    },
    draw(ctx, w, h, _totalAtY, now) {
      middle.x = w / 2;
      middle.y = h / 2;
      if (feverAt >= 0 && boomAt < 0) {
        rush(now);
        if (now - feverAt >= FV_MS) boom(now);
      }
      const deps = spawnGameDeps();

      // the fever: gold bars and light streaks, cooling off after the boom
      if (feverAt >= 0) {
        const heat = boomAt >= 0 ? 1 - clamp01((now - boomAt) / FV_COOL_MS) : 1;
        drawGoldBars(ctx, clamp01((now - feverAt) / FV_POUR_MS), heat);
        drawStreaks(ctx, heat, now);
        drawDetonation(ctx, middle, now - feverAt, FV_START_BLAST, now);
      }

      // the right taps' crit numbers popping off their bars in a blast
      for (let i = 0; i < pops.length; i++) {
        const p = pops[i];
        if (!deps || !barOnScreen(deps, p.floor, spot)) continue;
        const since = now - p.at;
        drawDetonation(ctx, spot, since, FV_STEP_BLAST, now);
        if (since >= FV_POP_MS) continue;
        const u = since / FV_POP_MS;
        ctx.save();
        ctx.globalAlpha =
          1 - clamp01((since - FV_POP_MS + FV_POP_FADE_MS) / FV_POP_FADE_MS);
        drawCritTextSprite(
          ctx,
          popSprite(p.tier),
          spot.x + FV_POP_ACROSS * u,
          spot.y - FV_POP_RISE * u - 4 * u * (1 - u) * FV_POP_LIFT,
          1,
        );
        ctx.restore();
      }

      // the blows flashing gold and blasting along their bars
      for (let t = 0; t < taps.length; t++) {
        const tap = taps[t];
        if (!deps || !barOnScreen(deps, tap.floor, bar)) continue;
        const since = now - tap.at;
        const glow = FV_BLOW_GLOW_ALPHA * (1 - since / FV_BLOW_GLOW_MS);
        if (glow > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = glow;
          drawGlow(ctx, GOLD, bar.x, bar.y, FV_BLOW_GLOW);
          ctx.restore();
        }
        const half =
          getIncomeBarBox(deps.floors.indexOf(tap.floor) === 0).width / 2;
        for (let j = 0; j < FV_RATTLE.length; j++) {
          spot.x = bar.x + FV_RATTLE[j] * half;
          spot.y = bar.y;
          drawDetonation(
            ctx,
            spot,
            since - j * FV_RATTLE_MS,
            FV_BLOW_BLAST,
            now,
          );
        }
      }

      if (boomAt >= 0) {
        const since = now - boomAt;
        const flash = FV_FLASH_ALPHA * (1 - since / FV_FLASH_MS);
        if (flash > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = flash;
          drawGlow(ctx, WHITE, middle.x, middle.y, FV_FLASH);
          ctx.restore();
        }
        drawDetonation(ctx, middle, since, FV_END_BLAST, now);
        for (let k = 0; k < FV_RING; k++) {
          const a = (k / FV_RING) * Math.PI * 2;
          spot.x = middle.x + Math.cos(a) * FV_RING_R;
          spot.y = middle.y + Math.sin(a) * FV_RING_R;
          drawDetonation(
            ctx,
            spot,
            since - (k + 1) * FV_RING_MS,
            FV_RING_BLAST,
            now,
          );
        }
        return since < FV_LINGER_MS;
      }
      return feverAt >= 0;
    },
  };
}

export const EFFECTS: (() => SimonEffect)[] = [createFever];
