// the "Electric Net" event (lightning; worker perma tiers, free upgrade
// levels and a crit tier): it covers its crit, whose click freezes the
// screen while a net of crackling lightning drops out of the sky over the
// screen, its mesh of bolts buzzing; every worker and income bar it falls
// across takes a bolt off its bottom edge in a blinding crack, a bang and a
// jolt: a perma tier for a worker, free levels for a bar; it drapes over
// the clicked floor's bar and cinches shut round it, the bar jumping a crit
// tier in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "electricNet";
const MAX_WORKERS = 5;
const MAX_BARS = 4;
// a net of COLS x ROWS knots, NET of the screen tall, INSET px in from its
// sides
const COLS = 4;
const ROWS = 3;
const NET = 0.45;
const INSET = 30;
const MESH = 0.45;
const BOLT_MS = 170;
const FINAL_MS = 300;
const FINAL_SCALE = 2;
const STRIKE_SHAKE: [number, number] = [0.6, 1.4];

type Target =
  | { at: Point; worker: RewardWorker; bar?: undefined }
  | { at: Point; bar: RewardBar; worker?: undefined };

export const forceElectricNetEvent = registerWispEvent(
  KEY,
  "Electric Net",
  () => CONFIG.electricNetEvent.chance,
  (floor, context, area) => {
    const { dropMs, cinchMs, levelShare, holdMs, mergeMs } =
      CONFIG.electricNetEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const height = (area.bottom - area.top) * NET;
    const left = area.left + INSET;
    const right = area.right - INSET;
    // the net's top edge, falling from above the screen till its bottom edge
    // lies on the clicked bar
    const settle = own.center.y - height;
    const netTop = (ms: number) =>
      lerp([area.top - height - 40, settle], easeIn(clamp01(ms / dropMs)));
    const knots: Point[] = Array.from({ length: COLS * ROWS }, () => ({
      x: 0,
      y: 0,
    }));
    const cinchAt = dropMs;
    const endAt = dropMs + cinchMs;
    const layout = (ms: number) => {
      const top = netTop(ms);
      const cinch = easeIn(clamp01((ms - cinchAt) / cinchMs));
      for (let r = 0; r < ROWS; r++)
        for (let col = 0; col < COLS; col++) {
          const k = knots[r * COLS + col];
          const x = lerp([left, right], col / (COLS - 1));
          // the mesh sags in the middle of each row
          const sag = Math.sin((col / (COLS - 1)) * Math.PI) * 24;
          const y = top + (height * r) / (ROWS - 1) + sag;
          k.x = lerp([x, own.center.x], cinch);
          k.y = lerp([y, own.center.y], cinch);
        }
    };
    const mesh: Bolt[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let col = 0; col < COLS; col++) {
        const k = knots[r * COLS + col];
        if (col < COLS - 1)
          mesh.push(createBolt(k, knots[r * COLS + col + 1], 0));
        if (r < ROWS - 1)
          mesh.push(createBolt(k, knots[(r + 1) * COLS + col], 0));
      }
    // the bottom edge passes y when netTop(ms) + height reaches it
    const fallsOn = (y: number) => {
      const from = area.top - 40;
      const share = clamp01((y - from) / (own.center.y - from));
      return dropMs * Math.sqrt(share);
    };
    const targets: Target[] = [
      ...findRewardWorkers(floor, context)
        .filter((w) => w.at.y < own.center.y)
        .slice(0, MAX_WORKERS)
        .map((worker) => ({ at: worker.at, worker })),
      ...(context.upgradeFloorFree
        ? found
            .filter((b) => b !== own && b.center.y < own.center.y)
            .slice(-MAX_BARS)
            .map((bar) => ({ at: bar.center, bar }))
        : []),
    ];
    const strikes = targets
      .map((target) => ({
        target,
        at: fallsOn(target.at.y),
        bolt: createBolt(
          {
            x: target.at.x + (Math.random() * 2 - 1) * 60,
            y: target.at.y - 90,
          },
          target.at,
          1,
        ),
      }))
      .sort((p, q) => p.at - q.at);

    const striking = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        const t = k / Math.max(1, strikes.length - 1);
        const { target } = s;
        if (target.worker) cover!.promote(target.worker);
        else
          cover!.levels(
            target.bar,
            levelsFor(target.bar.floor, levelShare, 2),
            s.bolt.from,
          );
        cover!.burst(target.at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
      },
    );
    const landing = createBeats(
      [cinchAt],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const cinching = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3), own.center);
        cover!.tierUp(own, own.center);
        cover!.slam(own);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own, ...targets.flatMap((t) => (t.bar ? [t.bar] : []))],
        workers: targets.flatMap((t) => (t.worker ? [t.worker] : [])),
        tick: (ms, now) => {
          striking.tick(ms, now);
          landing.tick(ms, now);
          cinching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FINAL_MS) return;
          if (ms < endAt) {
            layout(ms);
            const buzz = 0.6 + 0.4 * Math.random();
            for (const bolt of mesh) drawBolt(ctx, bolt, buzz, MESH);
          }
          for (const s of strikes) {
            const t = (ms - s.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, 1.1);
            drawStrike(ctx, s.target.at, 1 - t, 1.2, now);
          }
          const t = (ms - endAt) / FINAL_MS;
          if (t >= 0 && t < 1)
            drawStrike(ctx, own.center, 1 - t, FINAL_SCALE * 1.4, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
