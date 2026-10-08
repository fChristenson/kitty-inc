// the "Electric Eel" event (lightning; cash): it covers its crit, whose
// click freezes the screen while a huge eel of flowing cash swims in off one
// side and snakes across the screen in great S-waves, a blazing wisp at its
// head and crackling lightning arcing all along its body; it discharges
// again and again, ever faster, its whole body flaring with a crack, a jolt
// and bolts lashing out that spray coins; then it rears up and dives into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { totalSpot } from "../../cashFlow";

const KEY = "electricEel";
const REWARD = 4;
// the body runs NODES joints, each LAG ms behind the one ahead
const NODES = 9;
const LAG = 55;
const WAVES = 2;
const COINS = 1_100;
const SPREAD = 14;
const COIN = 0.65;
const ZAPS = 2;
const ZAP_REACH = 140;
const ZAP_COINS = 10;
const FLARE_MS = 160;
const ZAP_SHAKE: [number, number] = [0.7, 1.5];

export const forceElectricEelEvent = registerWispEvent(
  KEY,
  "Electric Eel",
  () => CONFIG.electricEelEvent.chance,
  (floor, context, area) => {
    const { swimMs, diveMs, discharges, holdMs, mergeMs } =
      CONFIG.electricEelEvent;
    const fallback = totalSpot(area);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const width = area.right - area.left;
    const startX = dir > 0 ? area.left - 80 : area.right + 80;
    const span = width * 0.85 + 80;
    const midY = area.top + (area.bottom - area.top) * 0.55;
    const sway = (area.bottom - area.top) * 0.22;
    const body = (NODES - 1) * LAG;
    const endAt = swimMs + diveMs;
    const rear = { x: 0, y: 0 };
    const lift = { x: 0, y: 0 };
    const swim = (ms: number, into: Point): Point => {
      const t = Math.max(0, ms);
      if (t <= swimMs) {
        const u = t / swimMs;
        into.x = startX + dir * span * u;
        into.y = midY + Math.sin(u * Math.PI * 2 * WAVES) * sway;
        return into;
      }
      swim(swimMs, rear);
      lift.x = rear.x;
      lift.y = fallback.y;
      const total = cover?.total() ?? fallback;
      return bezier(
        rear,
        lift,
        total,
        easeIn(clamp01((t - swimMs) / diveMs)),
        into,
      );
    };
    const joints: Point[] = Array.from({ length: NODES }, () => ({
      x: 0,
      y: 0,
    }));
    const links = joints.slice(1).map((j, i) => createBolt(joints[i], j, 0));
    const head: Point = { x: 0, y: 0 };
    const eel = (ms: number): Point | null =>
      ms < 0 || ms > endAt ? null : swim(ms, head);
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const lag = (i / COINS) * body;
      const dx = (Math.random() * 2 - 1) * SPREAD;
      const dy = (Math.random() * 2 - 1) * SPREAD;
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * (endAt + body) - lag;
        if (ms <= 0) return { x: startX, y: midY, scale: 0 };
        swim(Math.min(ms, endAt), at);
        return { x: at.x + dx, y: at.y + dy, scale: COIN };
      };
    });
    const zapsAt = Array.from(
      { length: discharges },
      (_, k) => swimMs * Math.sqrt((k + 1) / (discharges + 1)),
    );
    // bolts lashing off random joints, aimed fresh at each discharge
    const zaps = zapsAt.map(() =>
      Array.from({ length: ZAPS }, () => ({
        joint: 1 + Math.floor(Math.random() * (NODES - 1)),
        angle: Math.random() * Math.PI * 2,
        bolt: createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
      })),
    );

    const discharging = createBeats(
      zapsAt,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, discharges - 1);
        for (const zap of zaps[k]) {
          const from = swim(ms - zap.joint * LAG, { x: 0, y: 0 });
          const to = {
            x: from.x + Math.cos(zap.angle) * ZAP_REACH,
            y: from.y + Math.sin(zap.angle) * ZAP_REACH,
          };
          zap.bolt.from = from;
          zap.bolt.to = to;
          cover!.launchFrom(
            to,
            clampTargetsY(
              sprayTargets(to, ZAP_COINS, [60, 200]),
              area.top + 40,
              area.bottom - 20,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, t));
      },
    );
    const diving = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + body + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          discharging.tick(ms, now);
          diving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + body) return;
          let flare = -1;
          for (let k = 0; k < zapsAt.length; k++)
            if (ms >= zapsAt[k] && ms < zapsAt[k] + FLARE_MS) flare = k;
          for (let j = 0; j < NODES; j++)
            swim(Math.min(ms - j * LAG, endAt), joints[j]);
          const glow = flare >= 0 ? 1 : 0.55;
          for (const link of links)
            drawBolt(ctx, link, glow, flare >= 0 ? 0.9 : 0.5);
          if (flare >= 0) {
            const fade = 1 - (ms - zapsAt[flare]) / FLARE_MS;
            for (const zap of zaps[flare]) {
              drawBolt(ctx, zap.bolt, fade, 0.8);
              drawStrike(ctx, zap.bolt.to, fade, 0.9, now);
            }
          }
          drawWispBetween(
            ctx,
            eel,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / endAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt + body);
    playBoostEventStream();
  },
);
