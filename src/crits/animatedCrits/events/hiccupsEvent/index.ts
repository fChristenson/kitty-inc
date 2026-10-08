// the "Hiccups" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a huge lit bomb fizzes in the middle of the
// screen and blows in a big blast, bang and shake; but the blast hiccups,
// sucked straight back into the bomb as a ring of bombs it lit round it
// goes off one after another; the bomb swells and blows bigger, hiccups
// again with a wider ring of blasts, then blows a third time in a colossal
// blast that sets off a last cluster ring. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";

const KEY = "hiccups";
const REWARD = 4;
// each blow: its blast, the bomb's size before it, its ring of bombs
const SIZES = [300, 460, 700];
const BOMBS = [0.9, 1.3, 1.7];
const RINGS = [5, 7, 9];
const RING_R = [170, 250, 330];
const SHAKES = [1.4, 1.9];
const SAT = 0.34;
const SAT_FUSE = 26;
const SAT_BLAST = 190;
const FUSE = 46;
const SAT_GAP_MS = 24;
const SUCK = 16;
const COINS = 7;
const MAIN_COINS = 14;
const REACH: [number, number] = [70, 240];
const BANG_GAP_MS = 45;
const SAT_SHAKE = 0.8;
const SUCK_SHAKE = 0.5;

interface Blast {
  at: Point;
  ms: number;
  litAt: number;
  hiccup: number;
}

export const forceHiccupsEvent = registerWispEvent(
  KEY,
  "Hiccups",
  () => CONFIG.hiccupsEvent.chance,
  (floor, context, area) => {
    const { fuseMs, outMs, inMs, pauseMs, holdMs, mergeMs } =
      CONFIG.hiccupsEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.5,
    };
    const step = outMs + inMs + pauseMs;
    const blows = SIZES.map((_, k) => fuseMs + k * step);
    const final = blows[blows.length - 1];

    // each ring is lit as the blast reaches it and goes off as it's sucked back
    const sats: Blast[] = [];
    RINGS.forEach((count, k) => {
      const r = Math.min(RING_R[k], width * 0.44, height * 0.44);
      for (let j = 0; j < count; j++) {
        const a = (j / count) * Math.PI * 2 + k * 0.4;
        const last = k === RINGS.length - 1;
        sats.push({
          at: { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r },
          litAt: blows[k] + 60,
          ms: blows[k] + (last ? 140 : outMs + inMs * 0.3) + j * SAT_GAP_MS,
          hiccup: k,
        });
      }
    });
    const endAt = Math.max(final, ...sats.map((s) => s.ms)) + DETONATION_MS;

    // the bomb shows before each blow, swelling and fizzing
    const bomb: Point = { x: 0, y: 0 };
    const showsFrom = blows.map((_, k) =>
      k === 0 ? 0 : blows[k - 1] + outMs + inMs * 0.7,
    );
    const hiccupAt = (ms: number) => {
      for (let k = 0; k < blows.length; k++)
        if (ms >= showsFrom[k] && ms < blows[k]) return k;
      return -1;
    };
    const bombAt = (ms: number): Point | null => {
      const k = hiccupAt(ms);
      if (k < 0) return null;
      const tremble =
        2 + 6 * clamp01((ms - showsFrom[k]) / (blows[k] - showsFrom[k]));
      bomb.x = centre.x + Math.sin(ms * 0.07) * tremble;
      bomb.y = centre.y + Math.cos(ms * 0.09) * tremble;
      return bomb;
    };
    const satAts = sats.map((s) => () => s.at);

    let bang = -Infinity;
    const boom = (ms: number, shake: number) => {
      if (!cover!.isLive()) return;
      if (ms - bang >= BANG_GAP_MS) {
        bang = ms;
        playExplosion();
      }
      shakeScreen(shake);
    };
    const blowing = createBeats(
      blows,
      (ms) => ms,
      (ms, k) => {
        if (ms === final) {
          cover!.blast(centre);
          return;
        }
        cover!.burst(centre, 1 + 0.4 * k);
        cover!.launchFrom(
          centre,
          clampTargetsY(
            sprayTargets(centre, MAIN_COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        boom(ms, SHAKES[k]);
      },
    );
    const sucking = createBeats(
      blows.slice(0, -1),
      (ms) => ms + outMs,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SUCK_SHAKE);
      },
    );
    const popping = createBeats(
      sats,
      (s) => s.ms,
      (s) => {
        cover!.launchFrom(
          s.at,
          clampTargetsY(
            sprayTargets(s.at, COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        boom(s.ms, SAT_SHAKE * (1 + 0.2 * s.hiccup));
      },
    );
    const spot: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          blowing.tick(ms, now);
          sucking.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const k = hiccupAt(ms);
          const at = bombAt(ms);
          if (at) {
            const burn = clamp01(
              (ms - showsFrom[k]) / (blows[k] - showsFrom[k]),
            );
            drawLitFuse(ctx, at, burn, FUSE * BOMBS[k], now);
            drawWispHead(
              ctx,
              bombAt,
              ms,
              now,
              WISP_SIZE * BOMBS[k],
              0.4 + 0.5 * burn,
            );
          }
          for (let i = 0; i < sats.length; i++) {
            const s = sats[i];
            if (ms >= s.litAt && ms < s.ms) {
              const pop = easeOut(clamp01((ms - s.litAt) / 120));
              drawLitFuse(
                ctx,
                s.at,
                clamp01((ms - s.litAt) / (s.ms - s.litAt)),
                SAT_FUSE,
                now,
              );
              drawWispHead(ctx, satAts[i], ms, now, WISP_SIZE * SAT * pop, 0.6);
            }
            drawDetonation(ctx, s.at, ms - s.ms, SAT_BLAST, now);
          }
          // each blast plays out, then plays back in, sparks rushing home
          for (let h = 0; h < blows.length; h++) {
            const t = ms - blows[h];
            if (h === blows.length - 1) {
              drawDetonation(ctx, centre, t, SIZES[h], now);
              continue;
            }
            if (t < 0 || t >= outMs + inMs) continue;
            if (t < outMs) {
              drawDetonation(ctx, centre, t, SIZES[h], now);
              continue;
            }
            const v = (t - outMs) / inMs;
            drawDetonation(ctx, centre, outMs * (1 - v), SIZES[h], now);
            const reach = SIZES[h] * 0.6 * (1 - easeIn(v));
            for (let j = 0; j < SUCK; j++) {
              const a = (j / SUCK) * Math.PI * 2 + h;
              spot.x = centre.x + Math.cos(a) * reach;
              spot.y = centre.y + Math.sin(a) * reach;
              drawGlitterLight(ctx, spot.x, spot.y, 14, j, 1 - v * 0.5, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
