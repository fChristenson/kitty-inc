// the "Bomb Pachinko" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a field of glowing pegs lights up across
// the middle of the screen and lit bomb wisps pour in from the top,
// rattling down through it, every peg they hit a pop and a little blast;
// they come to rest along the bottom, where they go off one after another
// in big blasts spraying coins, each with its own shake, then the whole
// bottom row erupts at once and a river of cash blasts up into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "bombPachinko";
const REWARD = 4;
const BOMBS = 8;
const ROWS = 5;
const COLS = 7;
const EDGE = 60;
// the peg field's top and bottom, in shares of the screen's height
const FIELD: [number, number] = [0.24, 0.62];
const BOTTOM = 150;
const START = 40;
const FALL_MS = 200;
const HOP = 22;
const PEG = 16;
const PEG_FLASH_MS = 160;
const PEG_IN_MS = 150;
const ERUPT = 7;
const RIVER_MS = 420;
const BOMB = 0.36;
const FUSE = 14;
const POP = 75;
const BLAST = 185;
const CLUSTER_BLAST = 100;
const ERUPT_BLAST = 250;
const COINS = 18;
const ERUPT_COINS = 22;
const COIN_REACH: [number, number] = [40, 150];
const CHAIN_SHAKE: [number, number] = [0.7, 1.3];
const BANG_GAP_MS = 60;
const PEG_GLOW = fadeStops(COLOR.heavenlyGold);
const PEG_CORE = fadeStops(COLOR.white, 0.2);

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceBombPachinkoEvent = registerWispEvent(
  KEY,
  "Bomb Pachinko",
  () => CONFIG.bombPachinkoEvent.chance,
  (floor, context, area) => {
    const { dropGapMs, rowMs, chainMs, holdMs, mergeMs } =
      CONFIG.bombPachinkoEvent;
    const height = area.bottom - area.top;
    const spacing = (area.right - area.left - EDGE * 2) / COLS;
    const xAt = (p: number) => area.left + EDGE + p * spacing;
    const rowY = (r: number) => area.top + height * lerp(FIELD, r / (ROWS - 1));
    const ground = area.bottom - BOTTOM;
    // even rows have COLS pegs at half steps, odd rows COLS - 1 at whole ones
    const pegs: Point[] = [];
    const rowStart: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      rowStart.push(pegs.length);
      const even = r % 2 === 0;
      for (let c = 0; c < (even ? COLS : COLS - 1); c++)
        pegs.push({ x: xAt(c + (even ? 0.5 : 1)), y: rowY(r) });
    }
    const pegAt = (r: number, p: number) =>
      rowStart[r] + (r % 2 === 0 ? p - 0.5 : p - 1);
    const pops: Blast[] = [];
    const pegHits: { peg: number; ms: number }[] = [];
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      let p = 0.5 + ((k * 3 + 1) % COLS);
      const points: Point[] = [{ x: xAt(p), y: area.top - START }];
      const times: number[] = [k * dropGapMs];
      for (let r = 0; r < ROWS; r++) {
        if (r > 0) {
          const even = r % 2 === 0;
          const lo = even ? 0.5 : 1;
          const hi = even ? COLS - 0.5 : COLS - 1;
          let step = Math.random() < 0.5 ? -0.5 : 0.5;
          if (p + step < lo || p + step > hi) step = -step;
          p += step;
        }
        const peg = pegAt(r, p);
        const hit: Point = { x: pegs[peg].x, y: pegs[peg].y - PEG };
        const ms = times[0] + FALL_MS + r * rowMs;
        points.push(hit);
        times.push(ms);
        pegHits.push({ peg, ms });
        pops.push({ at: hit, ms, size: POP, shake: 0.25, coins: 0 });
      }
      const side =
        p <= 0.5
          ? 0.5
          : p >= COLS - 0.5
            ? -0.5
            : Math.random() < 0.5
              ? -0.5
              : 0.5;
      const rest: Point = { x: xAt(p + side), y: ground };
      points.push(rest);
      times.push(times[times.length - 1] + rowMs * 1.6);
      const at: Point = { x: 0, y: 0 };
      return {
        rest,
        leaves: times[0],
        lands: times[times.length - 1],
        blows: 0,
        at: (ms: number): Point => {
          let i = 0;
          while (i < times.length - 2 && ms >= times[i + 1]) i++;
          const u = clamp01((ms - times[i]) / (times[i + 1] - times[i]));
          const a = points[i];
          const b = points[i + 1];
          if (i === 0) {
            at.x = a.x;
            at.y = lerp([a.y, b.y], easeIn(u));
          } else {
            // a little hop off each peg, falling to the next
            at.x = lerp([a.x, b.x], u);
            at.y = lerp([a.y, b.y], easeIn(u)) - Math.sin(u * Math.PI) * HOP;
          }
          return at;
        },
      };
    });
    const landed = Math.max(...bombs.map((b) => b.lands));
    const blasts: Blast[] = [];
    [...bombs]
      .sort((a, b) => a.rest.x - b.rest.x)
      .forEach((b, i) => {
        b.blows = landed + 80 + i * chainMs;
        blasts.push({
          at: b.rest,
          ms: b.blows,
          size: BLAST,
          shake: lerp(CHAIN_SHAKE, i / (BOMBS - 1)),
          coins: COINS,
        });
        for (let c = 0; c < 2; c++)
          blasts.push({
            at: { x: b.rest.x + (c === 0 ? -1 : 1) * 45, y: b.rest.y - 40 },
            ms: b.blows + 40 + c * 30,
            size: CLUSTER_BLAST,
            shake: 0.5,
            coins: 0,
          });
      });
    const eruptAt = landed + 80 + BOMBS * chainMs + 120;
    for (let e = 0; e < ERUPT; e++)
      blasts.push({
        at: { x: xAt(((e + 0.5) / ERUPT) * COLS), y: ground },
        ms: eruptAt,
        size: ERUPT_BLAST,
        shake: e === 0 ? 2.2 : 0,
        coins: ERUPT_COINS,
      });
    const total = totalSpot(area);
    const base: Point = { x: (area.left + area.right) / 2, y: ground };
    const river = sampleLine(
      (u) => ({
        x: lerp([base.x, total.x], u),
        y: lerp([base.y, total.y], u),
      }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 700,
      width: 60,
      streamMs: RIVER_MS * 0.7,
      travelMs: RIVER_MS,
    };
    const endAt = eruptAt + RIVER_MS;
    const durationMs = Math.max(
      pourDurationMs(eruptAt, flight),
      endAt + holdMs + mergeMs,
    );
    let lastBang = -Infinity;
    let lastPop = -Infinity;

    const popping = createBeats(
      pops,
      (b) => b.ms,
      (b) => {
        cover!.burst(b.at, 0.2);
        if (!cover!.isLive()) return;
        shakeScreen(b.shake);
        if (b.ms - lastPop < BANG_GAP_MS) return;
        lastPop = b.ms;
        playBloop();
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.coins > 0)
          cover!.launchFrom(
            b.at,
            clampTargetsY(
              ringTargets(b.at, b.coins, COIN_REACH),
              area.top + EDGE,
              area.bottom - EDGE,
            ),
          );
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        if (b.shake > 0) shakeScreen(b.shake);
      },
    );
    const pouring = createBeats(
      [eruptAt],
      (ms) => ms,
      () => pourLine(cover!, river, flight),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          booming.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > eruptAt + 1_000) return;
          if (ms < eruptAt) {
            const shown =
              clamp01(ms / PEG_IN_MS) *
              (1 - clamp01((ms - eruptAt + PEG_IN_MS) / PEG_IN_MS));
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = shown * 0.8;
            for (const peg of pegs) drawGlow(ctx, PEG_GLOW, peg.x, peg.y, PEG);
            ctx.globalAlpha = shown;
            for (const peg of pegs)
              drawGlow(ctx, PEG_CORE, peg.x, peg.y, PEG * 0.45);
            for (const h of pegHits) {
              const t = (ms - h.ms) / PEG_FLASH_MS;
              if (t < 0 || t >= 1) continue;
              const peg = pegs[h.peg];
              ctx.globalAlpha = 1 - t;
              drawGlow(ctx, PEG_CORE, peg.x, peg.y, PEG * (1.4 + t));
            }
            ctx.restore();
          }
          for (const b of pops)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const b of bombs) {
            if (ms < b.leaves || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              (ms - b.leaves) / (b.blows - b.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              b.leaves,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
