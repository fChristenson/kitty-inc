// the "Static Cling" event (lightning; cash): it covers its crit, whose
// click freezes the screen while a wisp scuffs back and forth across the
// middle of the screen, faster and faster, building up static; it crackles
// with bolts that snap out to spots all over the screen, each a strike, a
// crack, a jolt and a ring of coins clinging to it; fully charged, it
// discharges one colossal bolt into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "staticCling";
const REWARD = 4;
const ZAPS = 10;
const REACH = 0.38;
const MARGIN = 110;
const TOP = 250;
const BOLT_MS = 170;
const DISCHARGE_MS = 300;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 130];
const RUBBER = 0.55;
const ZAP_SHAKE: [number, number] = [0.4, 1.1];
const BANG_GAP_MS = 60;

export const forceStaticClingEvent = registerWispEvent(
  KEY,
  "Static Cling",
  () => CONFIG.staticClingEvent.chance,
  (floor, context, area) => {
    const { chargeMs, holdMs, mergeMs } = CONFIG.staticClingEvent;
    const total = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2 + 80;
    const reach = (area.right - area.left) * REACH;
    const rub = (ms: number, into: Point): Point => {
      const u = clamp01(ms / chargeMs);
      into.x = cx + reach * Math.sin(Math.PI * 2 * (2 * u + 4 * u * u));
      into.y = cy + Math.sin(u * Math.PI * 9) * 12;
      return into;
    };
    const zaps = Array.from({ length: ZAPS }, (_, k) => {
      const ms = chargeMs * Math.sqrt((k + 1) / (ZAPS + 1));
      const to: Point = {
        x: lerp([area.left + MARGIN, area.right - MARGIN], Math.random()),
        y: lerp([area.top + TOP, area.bottom - MARGIN], Math.random()),
      };
      return { ms, to, bolt: createBolt(rub(ms, { x: 0, y: 0 }), to, 2) };
    });
    const discharge: Bolt = createBolt(rub(chargeMs, { x: 0, y: 0 }), total, 3);
    const endAt = chargeMs + DISCHARGE_MS;
    let lastBang = -Infinity;

    const zapping = createBeats(
      zaps,
      (z) => z.ms,
      (z, k) => {
        cover!.launchFrom(
          z.to,
          clampTargetsY(
            ringTargets(z.to, COINS, COIN_REACH),
            area.top + MARGIN,
            area.bottom - MARGIN / 2,
          ),
        );
        if (!cover!.isLive()) return;
        if (z.ms - lastBang >= BANG_GAP_MS) {
          lastBang = z.ms;
          playExplosion();
        }
        shakeScreen(lerp(ZAP_SHAKE, k / (ZAPS - 1)));
      },
    );
    const discharging = createBeats(
      [chargeMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const rubberAt: Point = { x: 0, y: 0 };
    const rubber = (ms: number): Point => rub(Math.max(0, ms), rubberAt);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          zapping.tick(ms, now);
          discharging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const z of zaps) {
            const t = (ms - z.ms) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, z.bolt, 1 - t, 1);
            drawStrike(ctx, z.to, 1 - t, 1.2, now);
          }
          const d = (ms - chargeMs) / DISCHARGE_MS;
          if (d >= 0 && d < 1) {
            drawBolt(ctx, discharge, 1 - d, 3);
            drawStrike(ctx, total, 1 - d, 3, now);
          }
          drawWispBetween(
            ctx,
            rubber,
            ms,
            now,
            WISP_SIZE * RUBBER,
            clamp01(ms / chargeMs),
            0,
            chargeMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
