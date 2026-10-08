// the "Fireworks" event: it covers its crit, whose click freezes the screen
// while wisps shoot up from its bottom edge one after another like rockets
// and burst high over the screen, each a bang, a jolt and a ring of coins,
// flinging a ring of small wisps out like stars that sag and fade; the last
// and biggest shell climbs right into the total-income readout and bursts
// there in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutCubic } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "fireworks";
const REWARD = 4;
// the shells' bursts, as shares of the screen across and down; the last
// bursts on the total
const SHELLS: Point[] = [
  { x: 0.25, y: 0.42 },
  { x: 0.75, y: 0.36 },
  { x: 0.4, y: 0.25 },
  { x: 0.65, y: 0.5 },
];
// each burst flings STARS stars REACH of the screen's width (or height, if
// less) out, sagging SAG px as they fade over STAR_MS
const STARS = 10;
const REACH = 0.24;
const SAG = 60;
const STAR_MS = 560;
// the wisps, as shares of the screen's width
const SHELL = 0.06;
const STAR = 0.05;
const BIG = 1.6;
const BURST_COINS = 24;
const BURST_REACH: [number, number] = [40, 120];
const POP_BURST = 0.9;
const POP_SHAKE = 1.6;

export const forceFireworksEvent = registerWispEvent(
  KEY,
  "Fireworks",
  () => CONFIG.fireworksEvent.chance,
  (floor, context, area) => {
    const { gapMs, riseMs, holdMs, mergeMs } = CONFIG.fireworksEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const reach = Math.min(width, height) * REACH;
    const fallback = totalSpot(area);
    const shells = [
      ...SHELLS.map((s) => ({
        x: area.left + width * s.x,
        y: area.top + height * s.y,
      })),
      fallback,
    ].map((at, k) => {
      const launch = k * gapMs;
      const from = {
        x: at.x + (Math.random() - 0.5) * width * 0.2,
        y: area.bottom + 20,
      };
      return { at, from, launch, popAt: launch + riseMs };
    });
    const last = shells.length - 1;
    const endAt = shells[last].popAt;
    const shellAt = shells.map((s, k) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const u = (ms - s.launch) / riseMs;
        if (u < 0 || u >= 1) return null;
        const to = k === last ? (cover?.total() ?? s.at) : s.at;
        const e = easeOutCubic(u);
        into.x = s.from.x + (to.x - s.from.x) * e;
        into.y = s.from.y + (to.y - s.from.y) * e;
        return into;
      };
    });
    // each burst's stars, flung out evenly round it and sagging as they slow
    const stars = shells.slice(0, last).flatMap((s, k) =>
      Array.from({ length: STARS }, (_, n) => {
        const a = ((n + (k % 2) * 0.5) / STARS) * Math.PI * 2;
        const into = { x: 0, y: 0 };
        const at = (ms: number): Point | null => {
          const u = (ms - s.popAt) / STAR_MS;
          if (u < 0 || u >= 1) return null;
          const out = reach * easeOut(u);
          into.x = s.at.x + Math.cos(a) * out;
          into.y = s.at.y + Math.sin(a) * out + SAG * u * u;
          return into;
        };
        return { at, from: s.popAt };
      }),
    );

    const launches = createBeats(
      shells,
      (s) => s.launch,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const pops = createBeats(
      shells,
      (s) => s.popAt,
      (s, k) => {
        if (k === last) {
          cover!.blast(cover!.total() ?? s.at);
          return;
        }
        cover!.burst(s.at, POP_BURST);
        cover!.launchFrom(s.at, ringTargets(s.at, BURST_COINS, BURST_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launches.tick(ms, now);
          pops.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const shell = Math.max(WISP_SIZE, width * SHELL);
          shells.forEach((s, k) =>
            drawWispBetween(
              ctx,
              shellAt[k],
              ms,
              now,
              k === last ? shell * BIG : shell,
              0.8,
              s.launch,
              s.popAt,
            ),
          );
          const star = Math.max(WISP_SIZE * 0.7, width * STAR);
          for (const s of stars) {
            const fade = 1 - clamp01((ms - s.from) / STAR_MS);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              star * (0.4 + 0.6 * fade),
              fade,
              s.from,
              s.from + STAR_MS,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
