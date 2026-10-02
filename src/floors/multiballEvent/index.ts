// the "Multiball" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while three wisp balls shoot out of the
// clicked floor's button and pinball round the screen, the income bars in
// view acting as bumpers: every bounce off a bar kicks it with a ding, a
// flash and a jolt and lands free upgrade levels tallied over it, the balls
// ever faster; then all three dive into the clicked floor's bar together in
// a huge blast and shake and every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "multiball";
const BALLS = 3;
const MAX_BARS = 4;
// stepped STEP_MS at a time, speeding up from SPEED[0] to SPEED[1] px/ms
const STEP_MS = 4;
const SPEED: [number, number] = [0.9, 1.7];
const BALL = 1;
// a ball can't bounce off the same bar again within REHIT_MS
const REHIT_MS = 80;
const HIT_SHAKE: [number, number] = [0.4, 1.1];
const HIT_BURST: [number, number] = [0.35, 0.6];

type Hit = { at: number; bar: RewardBar; spot: Point };

export const forceMultiballEvent = registerWispEvent(
  KEY,
  "Multiball",
  () => CONFIG.multiballEvent.chance,
  (floor, context, area) => {
    const { playMs, slamMs, levelShare, holdMs, mergeMs } =
      CONFIG.multiballEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const button = getButtonCenter(context.isGroundFloor);
    const r = (WISP_SIZE * BALL) / 2;
    const steps = Math.ceil(playMs / STEP_MS);
    // play the balls out once at arm time, recording every step and bounce
    const hits: Hit[] = [];
    const tracks = Array.from({ length: BALLS }, (_, b) => {
      const xs = new Float32Array(steps + 1);
      const ys = new Float32Array(steps + 1);
      const angle = -Math.PI / 2 + (b - 1) * 0.7 + (Math.random() - 0.5) * 0.3;
      let x = button.x;
      let y = button.y;
      let vx = Math.cos(angle);
      let vy = Math.sin(angle);
      const lastHit = new Map<RewardBar, number>();
      for (let i = 0; i <= steps; i++) {
        const t = i * STEP_MS;
        const speed = lerp(SPEED, t / playMs);
        const len = Math.hypot(vx, vy) || 1;
        vx = (vx / len) * speed;
        vy = (vy / len) * speed;
        const nx = x + vx * STEP_MS;
        const ny = y + vy * STEP_MS;
        for (const bar of bars) {
          const { box } = bar;
          if (nx < box.x - r || nx > box.x + box.width + r) continue;
          const wasAbove = y < box.y - r;
          const wasBelow = y > box.y + box.height + r;
          const inside = ny >= box.y - r && ny <= box.y + box.height + r;
          if (!inside || (!wasAbove && !wasBelow)) continue;
          vy = -vy;
          vx += (Math.random() - 0.5) * 0.4;
          if (t - (lastHit.get(bar) ?? -Infinity) >= REHIT_MS) {
            lastHit.set(bar, t);
            hits.push({
              at: t,
              bar,
              spot: { x: nx, y: wasAbove ? box.y : box.y + box.height },
            });
          }
        }
        x += vx * STEP_MS;
        y += vy * STEP_MS;
        if (x < area.left + r) vx = Math.abs(vx);
        if (x > area.right - r) vx = -Math.abs(vx);
        if (y < area.top + r) vy = Math.abs(vy);
        if (y > area.bottom - r) vy = -Math.abs(vy);
        x = Math.min(area.right - r, Math.max(area.left + r, x));
        y = Math.min(area.bottom - r, Math.max(area.top + r, y));
        xs[i] = x;
        ys[i] = y;
      }
      return { xs, ys };
    });
    hits.sort((a, b) => a.at - b.at);
    const slamAt = playMs + slamMs;
    const dives = tracks.map((_, b) => ({
      x: own.box.x + own.box.width * (0.25 + 0.25 * b),
      y: own.center.y,
    }));

    const balls = tracks.map((track, b) => {
      const into: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= slamAt) return null;
        if (ms < playMs) {
          const i = Math.min(steps, Math.floor(ms / STEP_MS));
          into.x = track.xs[i];
          into.y = track.ys[i];
          return into;
        }
        const u = easeIn((ms - playMs) / slamMs);
        const fx = track.xs[steps];
        const fy = track.ys[steps];
        into.x = fx + (dives[b].x - fx) * u;
        into.y = fy + (dives[b].y - fy) * u;
        return into;
      };
    });

    const bouncing = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hits.length - 1);
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), {
          x: h.spot.x,
          y: h.spot.y === h.bar.box.y ? h.spot.y - 40 : h.spot.y + 40,
        });
        cover!.burst(h.spot, lerp(HIT_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const finale = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare * 3, 2));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: slamAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / playMs);
          for (const at of balls)
            drawWispBetween(ctx, at, ms, now, r * 2, heat, 0, slamAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
