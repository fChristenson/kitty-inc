// the "Tripwire" event (beam; cash): it covers its crit, whose click
// freezes the screen while a vault's security lasers flicker on across the
// screen, tripwires sliding up and down; a thief wisp darts up through the
// gaps from the bottom, snatching stash after stash of cash on the way,
// each grab a bloop, a jolt and a spurt of coins; at the top it trips the
// alarm: every laser blazes and snaps shut on it, and it bolts into the
// total in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "tripwire";
const REWARD = 4;
const WIRES = 4;
const STASHES = 4;
// each wire sways SWAY px up and down; the thief hops between stashes
const SWAY = 70;
const THIEF = 0.55;
const BEAM = 14;
const GRAB_COINS = 22;
const GRAB_RING: [number, number] = [50, 170];
const GRAB_SHAKE: [number, number] = [0.4, 1];

export const forceTripwireEvent = registerWispEvent(
  KEY,
  "Tripwire",
  () => CONFIG.tripwireEvent.chance,
  (floor, context, area) => {
    const { hopMs, dwellMs, alarmMs, escapeMs, holdMs, mergeMs } =
      CONFIG.tripwireEvent;
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const wires = Array.from({ length: WIRES }, (_, i) => ({
      base: area.top + height * (0.25 + (0.6 * i) / (WIRES - 1)),
      rate: 0.003 + Math.random() * 0.004,
      phase: Math.random() * Math.PI * 2,
    }));
    const wireY = (w: (typeof wires)[number], ms: number) =>
      w.base + Math.sin(ms * w.rate + w.phase) * SWAY;
    const start: Point = { x: area.left + width / 2, y: area.bottom - 40 };
    const stashes: Point[] = Array.from({ length: STASHES }, (_, k) => ({
      x: area.left + width * (k % 2 === 0 ? 0.25 : 0.75),
      y: lerp(
        [area.bottom - height * 0.25, area.top + height * 0.25],
        k / (STASHES - 1),
      ),
    }));
    const grabs = stashes.map((at, k) => ({
      at,
      grabbed: (k + 1) * (hopMs + dwellMs) - dwellMs,
    }));
    const alarmAt = grabs[STASHES - 1].grabbed + dwellMs;
    const escapeAt = alarmAt + alarmMs;
    const endAt = escapeAt + escapeMs;
    const thiefAt: Point = { x: 0, y: 0 };
    const top = stashes[STASHES - 1];
    const thief = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      if (ms >= escapeAt) {
        const total = cover?.total() ?? fallback;
        const u = easeIn((ms - escapeAt) / escapeMs);
        thiefAt.x = lerp([top.x, total.x], u);
        thiefAt.y = lerp([top.y, total.y], u);
        return thiefAt;
      }
      let k = 0;
      while (k < STASHES - 1 && ms > grabs[k].grabbed + dwellMs) k++;
      const from = k === 0 ? start : stashes[k - 1];
      const leaves = grabs[k].grabbed - hopMs;
      const u = smoothstep(clamp01((ms - leaves) / hopMs));
      thiefAt.x = lerp([from.x, stashes[k].x], u);
      thiefAt.y = lerp([from.y, stashes[k].y], u) - Math.sin(Math.PI * u) * 40;
      return thiefAt;
    };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };

    const grabbing = createBeats(
      grabs,
      (g) => g.grabbed,
      (g, k) => {
        cover!.launchFrom(g.at, ringTargets(g.at, GRAB_COINS, GRAB_RING));
        cover!.burst(g.at, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(GRAB_SHAKE, k / (STASHES - 1)));
      },
    );
    const alarming = createBeats(
      [alarmAt],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(1.4);
      },
    );
    const escaping = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          grabbing.tick(ms, now);
          alarming.tick(ms, now);
          escaping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < escapeAt) {
            const snap = easeIn(clamp01((ms - alarmAt) / alarmMs));
            for (const w of wires) {
              const y = lerp([wireY(w, Math.min(ms, alarmAt)), top.y], snap);
              from.x = area.left;
              from.y = y;
              to.x = area.right;
              to.y = y;
              if (ms < alarmAt) drawAimLaser(ctx, from, to);
              else drawBeam(ctx, from, to, BEAM * (1 + snap));
            }
            if (ms >= alarmAt) drawBeamFlare(ctx, top, 40 * snap, 1, now);
          }
          drawWispBetween(
            ctx,
            thief,
            ms,
            now,
            WISP_SIZE * THIEF,
            clamp01(ms / endAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
