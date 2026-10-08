// the "Showdown" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while two gunslinger wisps face off from either
// side of the screen; level with each income bar in turn they draw and fire
// at each other, muzzles flashing, and the two shots meet head-on over the
// bar in a burst, a bang and a jolt that jumps the bar a crit tier, round
// after round, ever quicker; on the last bar they fan the hammer, three
// shots each smashing together across it, in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "showdown";
const MAX_BARS = 4;
const INSET = 60;
const ABOVE = 70;
// share of each round spent stepping up to the next bar before the draw
const STEP = 0.45;
// px per ms the shots fly
const SPEED = 2.4;
const FAN = 3;
const FAN_GAP_MS = 70;
const FLASH_MS = 120;
const CLASH = 60;
const CLASH_MS = 260;
const SLINGER = 0.55;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Clash {
  at: Point;
  ms: number;
  bar: RewardBar;
  last: boolean;
}

export const forceShowdownEvent = registerWispEvent(
  KEY,
  "Showdown",
  () => CONFIG.showdownEvent.chance,
  (floor, context, area) => {
    const { roundsMs, holdMs, mergeMs } = CONFIG.showdownEvent;
    // bottom up
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const xs = [area.left + INSET, area.right - INSET];
    const rows = bars.map((bar) => bar.box.y - ABOVE);
    const bullets: Bullet[] = [];
    const flashes: { at: Point; angle: number; ms: number }[] = [];
    const clashes: Clash[] = [];
    const draws: number[] = [];
    let clock: number = 0;
    bars.forEach((bar, k) => {
      const roundMs = lerp(roundsMs, k / Math.max(1, bars.length - 1));
      const draw = clock + roundMs * STEP;
      draws.push(draw);
      const last = k === bars.length - 1;
      const shots = last ? FAN : 1;
      for (let s = 0; s < shots; s++) {
        const meet: Point = {
          x:
            shots === 1
              ? bar.center.x
              : lerp(
                  [
                    bar.box.x + bar.box.width * 0.2,
                    bar.box.x + bar.box.width * 0.8,
                  ],
                  s / (shots - 1),
                ),
          y: rows[k] + 30,
        };
        const froms = xs.map((x) => ({ x, y: rows[k] }));
        const dists = froms.map((f) => Math.hypot(meet.x - f.x, meet.y - f.y));
        const hitAt = draw + s * FAN_GAP_MS + Math.max(...dists) / SPEED;
        froms.forEach((from, side) => {
          const firedAt = hitAt - dists[side] / SPEED;
          bullets.push(aimBullet(from, meet, firedAt, SPEED));
          flashes.push({
            at: from,
            angle: Math.atan2(meet.y - from.y, meet.x - from.x),
            ms: firedAt,
          });
        });
        clashes.push({
          at: meet,
          ms: hitAt,
          bar,
          last: last && s === shots - 1,
        });
      }
      clock += roundMs;
    });
    const final = clashes[clashes.length - 1];
    const endAt = final.ms + CLASH_MS;
    // each gunslinger stepping up level with the next bar before each draw
    const slingers = xs.map((x) => {
      const spot: Point = { x, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        let y = rows[0];
        for (let k = 1; k < rows.length; k++) {
          const from = draws[k] - (draws[k] - draws[k - 1]) * 0.5;
          y = lerp(
            [y, rows[k]],
            smoothstep(clamp01((ms - from) / (draws[k] - from))),
          );
        }
        spot.y = y;
        return spot;
      };
    });

    const drawing = createBeats(
      draws,
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clashing = createBeats(
      clashes,
      (c) => c.ms,
      (c) => {
        if (c.last) {
          cover!.tierUp(c.bar, c.at);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.at);
          return;
        }
        // the last bar's tier waits for the last of its fanned shots
        if (c.bar !== final.bar) cover!.tierUp(c.bar, c.at);
        cover!.burst(c.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(
          lerp(HIT_SHAKE, bars.indexOf(c.bar) / Math.max(1, bars.length - 1)),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          drawing.tick(ms, now);
          clashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.4, true);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.at,
              f.angle,
              (ms - f.ms) / FLASH_MS,
              WISP_SIZE,
            );
          for (const c of clashes) {
            const t = (ms - c.ms) / CLASH_MS;
            if (t >= 0 && t < 1) drawBeamFlare(ctx, c.at, CLASH, 1 - t, now);
          }
          for (const at of slingers)
            drawWisp(ctx, at, ms, now, WISP_SIZE * SLINGER, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
