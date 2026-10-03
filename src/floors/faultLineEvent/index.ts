// the "Fault Line" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a line of buried charges splits open from
// the clicked floor's button along a jagged fault toward an income bar and
// goes off in a racing chain, every charge a white blast, a bang and its
// own shake; at the bar a cluster of charges round it erupts all at once
// round one big blast and the bar jumps a crit tier; the fault tears on to
// the next bar and the next, ever faster, the last eruption one huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "faultLine";
const MAX_BARS = 3;
// CHARGES charges along each fault, jagging JAG px; RING charges round each bar
const CHARGES = 6;
const JAG = 50;
const RING = 5;
const RING_R = 90;
// a charge shows SHOW_MS before it blows
const SHOW_MS = 250;
const CHARGE = 0.3;
const FUSE = 14;
const BLAST = 140;
const RING_BLAST = 130;
const BIG = 220;
const HUGE = 300;
const BANG_GAP_MS = 60;
const CHAIN_SHAKE: [number, number] = [0.4, 0.9];
const ERUPT_SHAKE: [number, number] = [1, 1.5];

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  bar: RewardBar | null;
  charge: boolean;
}

export const forceFaultLineEvent = registerWispEvent(
  KEY,
  "Fault Line",
  () => CONFIG.faultLineEvent.chance,
  (floor, context) => {
    const { chainsMs, holdMs, mergeMs } = CONFIG.faultLineEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    let clock = SHOW_MS;
    let from: Point = button;
    bars.forEach((bar, k) => {
      const gap = lerp(chainsMs, k / Math.max(1, bars.length - 1));
      const to = bar.center;
      for (let i = 1; i <= CHARGES; i++) {
        const u = i / (CHARGES + 1);
        blasts.push({
          at: {
            x: lerp([from.x, to.x], u) + (i % 2 === 0 ? JAG : -JAG) * (1 - u),
            y: lerp([from.y, to.y], u),
          },
          ms: clock,
          size: BLAST,
          shake: lerp(CHAIN_SHAKE, i / CHARGES),
          bar: null,
          charge: true,
        });
        clock += gap;
      }
      // the eruption: a ring of charges round one big blast, all at once
      for (let r = 0; r < RING; r++) {
        const a = (r / RING) * Math.PI * 2;
        blasts.push({
          at: {
            x: to.x + Math.cos(a) * RING_R,
            y: to.y + Math.sin(a) * RING_R * 0.6,
          },
          ms: clock,
          size: RING_BLAST,
          shake: 0,
          bar: null,
          charge: true,
        });
      }
      blasts.push({
        at: to,
        ms: clock,
        size: k === bars.length - 1 ? HUGE : BIG,
        shake: lerp(ERUPT_SHAKE, k / Math.max(1, bars.length - 1)),
        bar,
        charge: false,
      });
      clock += gap * 2;
      from = to;
    });
    const lastBar = bars[bars.length - 1];
    const endAt = Math.max(...blasts.map((b) => b.ms));
    const charges = blasts
      .filter((b) => b.charge)
      .map((b) => ({ ...b, spot: () => b.at }));
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.bar) {
          cover!.tierUp(b.bar, button);
          if (b.bar === lastBar) {
            for (const bar of bars) cover!.slam(bar);
            cover!.blast(b.at);
            return;
          }
        }
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        if (b.shake > 0) shakeScreen(b.shake);
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
        tick: (ms, now) => booming.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const c of charges) {
            if (ms < c.ms - SHOW_MS || ms >= c.ms) continue;
            drawLitFuse(
              ctx,
              c.at,
              clamp01(1 - (c.ms - ms) / SHOW_MS),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              c.spot,
              ms,
              now,
              WISP_SIZE * CHARGE,
              0.6,
              c.ms - SHOW_MS,
              c.ms,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
