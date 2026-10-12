// the "Lotto Drum" event (wisp; levels + crit tier): it covers its crit,
// whose click freezes the screen while wisps pour out of the clicked button
// into a glitter drum in the middle of the screen and tumble round it; one
// by one, quicker and quicker, the drum rattles and a wisp is drawn out of
// its top, shooting onto a bar with its levels; then the drum bursts and
// every wisp left pours onto the clicked bar in a rattle of blasts, the last
// huge as it climbs a crit tier
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSpinTick } from "../../../../sound";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "lottoDrum";
const WISPS = 16;
// the drum, of the screen's width (or height, if that's tighter)
const RADIUS = 0.22;
const RADIUS_OF_HEIGHT = 0.15;
// the wisps flying in off the button, one after another
const ENTER_FROM_MS = 60;
const ENTER_GAP_MS = 14;
const ENTER_MS = 220;
const ENTER_LIFT = 0.12;
// tumbling: each wisp's own turn rate and in-and-out swing
const TUMBLE_SPIN = 0.005;
const TUMBLE_SWING = 0.004;
const TUMBLE_IN: [number, number] = [0.25, 0.85];
// the shell: glimmers round the drum, turning, rattling at each draw
const SHELL = 36;
const SHELL_GLIMMER = 34;
const SHELL_SPIN = 0.002;
const SHELL_GROW_MS = 250;
const RATTLE = 0.05;
const RATTLE_MS = 80;
const DRUM_GLOW = 1.2;
// a draw: out of the mouth over its first share of the flight, then onto
// its bar bowed LIFT (of the width) over it
const MOUTH_ABOVE = 0.05;
const MOUTH_SHARE = 0.3;
const DRAW_LIFT = 0.11;
const DRAW_GAP_MS: [number, number] = [270, 90];
const MOUTH_BLAST = 70;
const LAND_BLAST = 90;
const LAND_SHAKE = 0.6;
const DRAW_SHAKE = 0.3;
const TICK_RATE: [number, number] = [0.9, 1.6];
// the burst: the rest pouring onto the clicked bar, the last huge
const BURST_LAG_MS = 200;
const BURST_BLAST = 200;
const BURST_SHAKE = 1.4;
const POUR_MS = 260;
const POUR_LIFT = 0.16;
const POUR_BLAST = 70;
const POUR_SHAKE = 0.4;
const BOOM_LAG_MS = 120;
const BOOM_BLAST = 260;
const BOOM_SHAKE = 3;
const WISP = WISP_SIZE * 1.4;
const SOUND_GAP_MS = 55;

export const forceLottoDrumEvent = registerWispEvent(
  KEY,
  "Lotto Drum",
  () => CONFIG.lottoDrumEvent.chance,
  (floor, context, area) => {
    const {
      firstDrawMs,
      draws,
      flyMs,
      pourGapMs,
      levelShare,
      winnerShare,
      holdMs,
      mergeMs,
    } = CONFIG.lottoDrumEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius = Math.min(width * RADIUS, height * RADIUS_OF_HEIGHT);
    const mouth: Point = {
      x: center.x,
      y: center.y - radius - width * MOUTH_ABOVE,
    };
    const button = getButtonCenter(context.isGroundFloor);
    const drawn = Math.min(draws, WISPS - 1);

    // where wisp i tumbles in the drum ms in
    const inDrum = (i: number, ms: number, into: Point): Point => {
      const a =
        hash01(i, 4501) * Math.PI * 2 +
        (hash01(i, 4502) - 0.5) * 2 * TUMBLE_SPIN * ms;
      const swing = Math.abs(
        Math.sin(ms * TUMBLE_SWING * (0.7 + hash01(i, 4503)) + i),
      );
      const r = radius * lerp(TUMBLE_IN, swing);
      into.x = center.x + Math.cos(a) * r;
      into.y = center.y + Math.sin(a) * r;
      return into;
    };
    const enterAt = (i: number) => ENTER_FROM_MS + i * ENTER_GAP_MS;

    // the draws, onto every other bar top to bottom (the clicked one alone)
    const others = bars
      .filter((b) => b !== clicked)
      .sort((a, b) => a.center.y - b.center.y);
    const pool = others.length > 0 ? others : [clicked];
    let clock: number = firstDrawMs;
    const picks = Array.from({ length: drawn }, (_, k) => {
      const bar = pool[k % pool.length];
      const at = clock;
      clock += lerp(DRAW_GAP_MS, k / Math.max(1, drawn - 1));
      return {
        at,
        land: at + flyMs,
        bar,
        to: {
          x: bar.box.x + bar.box.width * (0.1 + 0.8 * hash01(k, 4504)),
          y: bar.center.y,
        },
        from: inDrum(k, at, { x: 0, y: 0 }),
      };
    });
    const burstAt = picks[drawn - 1].land + BURST_LAG_MS;
    const left = WISPS - drawn;
    const pours = Array.from({ length: left }, (_, j) => ({
      at: burstAt + j * pourGapMs,
      land: burstAt + j * pourGapMs + POUR_MS,
      to: {
        x:
          clicked.box.x +
          clicked.box.width * (0.1 + (0.8 * j) / Math.max(1, left - 1)),
        y: clicked.center.y,
      },
      from: inDrum(drawn + j, burstAt, { x: 0, y: 0 }),
    }));
    const boomAt = pours[left - 1].land + BOOM_LAG_MS;
    const endMs = boomAt + DETONATION_MS;

    // each wisp's path: in off the button, tumbling, then out onto its bar
    const paths = Array.from({ length: WISPS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      const enter = enterAt(i);
      const spot: Point = { x: 0, y: 0 };
      const arc = (a: Point, b: Point, lift: number, t: number) => {
        at.x = lerp([a.x, b.x], t);
        at.y = lerp([a.y, b.y], t) - 4 * t * (1 - t) * width * lift;
        return at;
      };
      const leave = i < drawn ? picks[i] : pours[i - drawn];
      return (ms: number): Point | null => {
        if (ms < enter) return null;
        if (ms < enter + ENTER_MS) {
          inDrum(i, enter + ENTER_MS, spot);
          return arc(button, spot, ENTER_LIFT, (ms - enter) / ENTER_MS);
        }
        if (ms < leave.at) return inDrum(i, ms, at);
        if (i >= drawn) {
          const t = (ms - leave.at) / POUR_MS;
          return t >= 1 ? null : arc(leave.from, leave.to, POUR_LIFT, t * t);
        }
        const t = (ms - leave.at) / flyMs;
        if (t >= 1) return null;
        if (t < MOUTH_SHARE) {
          const u = t / MOUTH_SHARE;
          at.x = lerp([leave.from.x, mouth.x], u);
          at.y = lerp([leave.from.y, mouth.y], u);
          return at;
        }
        return arc(
          mouth,
          leave.to,
          DRAW_LIFT,
          (t - MOUTH_SHARE) / (1 - MOUTH_SHARE),
        );
      };
    });

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const levels = new Map<RewardBar, number>(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    const drawing = createBeats(
      picks,
      (p) => p.at,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSpinTick(lerp(TICK_RATE, k / Math.max(1, drawn - 1)));
        shakeScreen(DRAW_SHAKE);
      },
    );
    const landing = createBeats(
      picks,
      (p) => p.land,
      (p, _, now) => {
        cover!.levels(p.bar, levels.get(p.bar)!, p.to);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        bang(now);
      },
    );
    const pouring = createBeats(
      pours,
      (p) => p.land,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(POUR_SHAKE);
        bang(now);
      },
    );
    const beats = createBeats(
      [burstAt, boomAt],
      (ms) => ms,
      (_, i, now) => {
        if (i === 1) {
          cover!.levels(clicked, levelsFor(clicked.floor, winnerShare, 1));
          cover!.tierUp(clicked, clicked.center);
          for (const bar of bars) cover!.slam(bar);
        }
        if (!cover!.isLive()) return;
        shakeScreen(i === 0 ? BURST_SHAKE : BOOM_SHAKE);
        bang(now);
      },
    );
    const rattleAt = (ms: number) => {
      let rattle = 0;
      for (const p of picks)
        if (ms >= p.at) rattle = Math.exp(-(ms - p.at) / RATTLE_MS);
      return rattle;
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: boomAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          drawing.tick(ms, now);
          landing.tick(ms, now);
          pouring.tick(ms, now);
          beats.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          // the drum's glitter shell, turning, rattling at each draw
          if (ms < burstAt) {
            const grow = 1 - (1 - clamp01(ms / SHELL_GROW_MS)) ** 3;
            const rattle = rattleAt(ms);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            stampGlimmer(
              ctx,
              center.x,
              center.y,
              radius * DRUM_GLOW * grow,
              3,
              COLOR.heavenlyGold,
            );
            for (let k = 0; k < SHELL; k++) {
              const a = (k / SHELL) * Math.PI * 2 + ms * SHELL_SPIN;
              const r =
                radius *
                grow *
                (1 + RATTLE * rattle * Math.sin(k * 7 + ms * 0.1));
              stampGlimmer(
                ctx,
                center.x + Math.cos(a) * r,
                center.y + Math.sin(a) * r,
                SHELL_GLIMMER * (0.7 + 0.3 * Math.sin(now * 0.02 + k)),
                k,
                k % 3 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            endLightBatch(ctx);
            ctx.restore();
          }
          for (let i = 0; i < WISPS; i++)
            drawWisp(ctx, paths[i], ms, now, WISP, i < drawn ? 0.6 : 0.3);
          for (const p of picks) {
            drawDetonation(
              ctx,
              mouth,
              ms - p.at - flyMs * MOUTH_SHARE,
              MOUTH_BLAST,
              now,
            );
            drawDetonation(ctx, p.to, ms - p.land, LAND_BLAST, now);
          }
          drawDetonation(ctx, center, ms - burstAt, BURST_BLAST, now);
          for (const p of pours)
            drawDetonation(ctx, p.to, ms - p.land, POUR_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - boomAt, BOOM_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
