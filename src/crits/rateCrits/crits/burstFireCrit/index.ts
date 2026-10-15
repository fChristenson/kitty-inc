// Burst Fire, a rate crit: a gun wisp pops up over the left end of every bar
// and fires three-round bursts of wisp bullets down into its readout, each
// round a muzzle flash, a recoil and a spark, a blast on every third; the
// bursts ripple down the building, quicker and quicker, until every gun
// lets rip one long burst, its own last and fattest, and each readout turns
// over: every third payout pays triple for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each gun IN px in from its bar's left end, UP px over it, popping up over
// POP_MS
const IN = 60;
const UP = BAR_HALF_H + 70;
const POP_MS = 120;
const GUN = WISP_SIZE * 1.3;
const OWN_GUN = WISP_SIZE * 1.8;
// BURSTS bursts of SHOTS rounds SHOT_MS apart, the bursts GAPS_MS apart
// (closing) from FIRST_MS, each bar STAGGER_MS after the one above; then a
// long burst of LONG rounds LONG_MS apart
const FIRST_MS = 300;
const BURSTS = 4;
const SHOTS = 3;
const SHOT_MS = 50;
const GAPS_MS: [number, number] = [300, 150];
const STAGGER_MS = 35;
const LONG_GAP_MS = 220;
const LONG = 9;
const LONG_MS = 32;
// px per ms: a round crosses its bar in about 100ms
const SPEED = 5;
const ROUND = WISP_SIZE * 0.5;
const OWN_ROUND = WISP_SIZE * 0.8;
// rounds land SPREAD px about the readout's middle
const SPREAD: Point = { x: 90, y: 22 };
const RECOIL = 26;
const RECOIL_MS = 50;
const FLASH_MS = 70;
const FLASH = 90;
const SPARK = 48;
const SPARK_MS = 140;
const BURST_BLAST = 80;
const LAST_BLAST = 150;
const OWN_BLAST = 320;
const FADE_MS = 160;
// shakes by step: a burst, the long burst, its own
const SHAKES = [0.35, 1, 2.8];

interface Gun {
  bar: number;
  own: boolean;
  // from its bar's middle
  at: Point;
  angle: number;
  rounds: Bullet[];
  // the third round of each burst, and the long burst's last
  blasts: number[];
  doneMs: number;
}
const states = new WeakMap<Running, Gun[]>();
const head: Point = { x: 0, y: 0 };
const atHead = () => head;
const spot: Point = { x: 0, y: 0 };

// every third payout pays triple, till then
const bursts = defineBarEffect<{ until: number; n: number }>({
  payout: (run) => (run.n % 3 === 2 ? meta.values.payout : 1),
  onPayout: (run) => ({ until: run.until, n: run.n + 1 }),
  ended: (run, now) => now >= run.until,
});

registerFloorCrit("burstFireCrit", {
  reward(t) {
    t.flipRate();
    bursts.set(t.floor, {
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
      n: 0,
    });
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const guns: Gun[] = ownLast(bars).map((bar, k) => {
      const own = bar === 0;
      const at = { x: -half + IN, y: -UP };
      const rounds: Bullet[] = [];
      const blasts: number[] = [];
      const fire = (ms: number) => {
        const n = rounds.length;
        const to = {
          x: (holeHash(n + k * 40, 5210) * 2 - 1) * SPREAD.x,
          y: (holeHash(n + k * 40, 5211) * 2 - 1) * SPREAD.y,
        };
        rounds.push(aimBullet(at, to, ms, SPEED));
        return rounds[n].hitAt;
      };
      let t = FIRST_MS + k * STAGGER_MS;
      for (let b = 0; b < BURSTS; b++) {
        let landed = 0;
        for (let s = 0; s < SHOTS; s++) landed = fire(t + s * SHOT_MS);
        blasts.push(landed);
        hit(bar, landed, 0);
        t += lerp(GAPS_MS[0], GAPS_MS[1], b / (BURSTS - 1));
      }
      t += LONG_GAP_MS - GAPS_MS[1];
      let landed = 0;
      for (let s = 0; s < LONG; s++) landed = fire(t + s * LONG_MS);
      blasts.push(landed);
      hit(bar, landed, own ? 2 : 1);
      return {
        bar,
        own,
        at,
        angle: Math.atan2(-at.y, -at.x),
        rounds,
        blasts,
        doneMs: landed,
      };
    });
    states.set(r, guns);
  },
  draw(ctx, r, ms, bars) {
    const guns = states.get(r);
    if (!guns) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const pop = clamp01((ms - IN_MS) / POP_MS);
    if (pop <= 0) return;
    for (const gun of guns) {
      const bar = bars[gun.bar];
      const fade = 1 - clamp01((ms - gun.doneMs) / FADE_MS);
      ctx.save();
      ctx.translate(bar.x, bar.y);
      // the gun kicking back off every round, popping up over the bar's end
      let kick = 0;
      for (const round of gun.rounds) {
        const since = ms - round.firedAt;
        if (since < 0) break;
        kick += Math.exp(-since / RECOIL_MS);
      }
      head.x = gun.at.x - Math.cos(gun.angle) * RECOIL * Math.min(1.5, kick);
      head.y =
        gun.at.y * pop - Math.sin(gun.angle) * RECOIL * Math.min(1.5, kick);
      drawWispHead(
        ctx,
        atHead,
        ms,
        now,
        (gun.own ? OWN_GUN : GUN) * pop,
        Math.min(1, kick),
        fade,
      );
      drawBullets(ctx, gun.rounds, ms, now, gun.own ? OWN_ROUND : ROUND);
      for (const round of gun.rounds) {
        const since = ms - round.firedAt;
        if (since < 0) break;
        if (since < FLASH_MS)
          drawMuzzleFlash(
            ctx,
            gun.at,
            gun.angle,
            since / FLASH_MS,
            gun.own ? FLASH * 1.4 : FLASH,
          );
      }
      // a spark where every round lands
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < gun.rounds.length; i++) {
        const round = gun.rounds[i];
        const since = ms - round.hitAt;
        if (since < 0 || since >= SPARK_MS) continue;
        stampGlimmer(
          ctx,
          round.to.x,
          round.to.y,
          SPARK * (gun.own ? 1.4 : 1) * (1 - since / SPARK_MS),
          i,
          i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      for (let b = 0; b < gun.blasts.length; b++) {
        const last = b === gun.blasts.length - 1;
        spot.x = 0;
        spot.y = 0;
        drawDetonation(
          ctx,
          spot,
          ms - gun.blasts[b],
          last ? (gun.own ? OWN_BLAST : LAST_BLAST) : BURST_BLAST,
          now,
        );
      }
      ctx.restore();
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
