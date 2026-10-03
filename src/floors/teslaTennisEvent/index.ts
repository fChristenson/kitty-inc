// the "Tesla Tennis" event (lightning; cash): it covers its crit, whose
// click freezes the screen while two crackling paddle wisps rise at the
// screen's left and right edges and a ball wisp is served out of the
// clicked floor's button; each paddle slides to meet it and smashes it back
// with a crack of lightning, a flash, a bang and a jolt that sprays cash
// off the ball, the rally ever faster and harder; then the last return is
// smashed up into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBolt, drawBolt, drawStrike, type Bolt } from "../../shared/lightning";
import { totalSpot } from "../cashFlow";

const KEY = "teslaTennis";
const REWARD = 4;
const RETURNS = 7;
const SIDE = 50;
const REACH = 70;
const ARC = 110;
const BOLT_MS = 150;
const COINS = 9;
const BALL = 0.55;
const PADDLE = 0.6;
const HIT_SHAKE: [number, number] = [0.5, 1.4];

interface Hit {
  at: Point;
  side: number;
  ms: number;
  bolt: Bolt;
}

export const forceTeslaTennisEvent = registerWispEvent(
  KEY,
  "Tesla Tennis",
  () => CONFIG.teslaTennisEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.teslaTennisEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const xs = [area.left + SIDE, area.right - SIDE];
    const top = area.top + 260;
    const bottom = area.bottom - 160;
    let clock = 0;
    const hits: Hit[] = Array.from({ length: RETURNS }, (_, k) => {
      const side = (k + 1) % 2;
      clock += lerp(shotsMs, k / RETURNS);
      const at = { x: xs[side] + (side === 0 ? REACH : -REACH), y: lerp([top, bottom], Math.random()) };
      return { at, side, ms: clock, bolt: createBolt({ x: xs[side], y: at.y }, at, 1) };
    });
    const smashAt = clock + lerp(shotsMs, 1);
    const endAt = smashAt;
    const route: { from: Point; to: Point; starts: number; ends: number }[] = [];
    let from: Point = button;
    let starts = 0;
    for (const h of hits) {
      route.push({ from, to: h.at, starts, ends: h.ms });
      from = h.at;
      starts = h.ms;
    }
    route.push({ from, to: total, starts, ends: smashAt });
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      const t = Math.max(0, ms);
      let leg = route[0];
      for (const r of route) if (t >= r.starts) leg = r;
      const u = clamp01((t - leg.starts) / (leg.ends - leg.starts));
      const aim = leg.to === total ? (cover?.total() ?? total) : leg.to;
      ballAt.x = lerp([leg.from.x, aim.x], u);
      ballAt.y = lerp([leg.from.y, aim.y], u) - Math.sin(Math.PI * u) * ARC;
      return ballAt;
    };
    // each paddle glides from its last return to its next
    const paddles = [0, 1].map((side) => {
      const mine = hits.filter((h) => h.side === side);
      const at: Point = { x: xs[side], y: (top + bottom) / 2 };
      return (ms: number): Point => {
        let y = mine.length > 0 ? mine[0].at.y : at.y;
        let since = 0;
        for (const h of mine) {
          if (ms >= h.ms) {
            since = h.ms;
            continue;
          }
          y = lerp([y, h.at.y], smoothstep(clamp01((ms - since) / Math.max(1, h.ms - since))));
          break;
        }
        at.y = y;
        return at;
      };
    });

    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.burst(h.at, 0.4);
        const aim = h.side === 0 ? 0 : Math.PI;
        cover!.launchFrom(h.at, clampTargetsY(sprayTargets(h.at, COINS, [60, 220], aim, 1.6), area.top + 40, area.bottom - 40));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (RETURNS - 1)));
      },
    );
    const finale = createBeats([smashAt], (ms) => ms, () => cover!.blast(cover!.total() ?? total));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const h of hits) {
            const t = (ms - h.ms) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, h.bolt, 1 - t, 0.8);
            drawStrike(ctx, h.at, 1 - t, 0.7, now);
          }
          for (const p of paddles)
            drawWispBetween(ctx, p, ms, now, WISP_SIZE * PADDLE, 0.6, 0, endAt);
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * BALL, 0.9, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
