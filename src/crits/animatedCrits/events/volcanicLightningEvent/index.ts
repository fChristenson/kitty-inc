// the "Volcanic Lightning" event (lightning; free upgrade levels): it covers
// its crit, whose click freezes the screen while the clicked floor's button
// erupts: a plume of ash wisps billows up out of it, churning and spreading,
// and lightning leaps out of the plume, bolt after bolt cracking down onto
// the income bars, each a blinding flash, a bang and a big jolt as the bar
// lands free levels; ever quicker, until the whole plume discharges at once,
// a bolt onto every bar in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "volcanicLightning";
const MAX_BARS = 4;
const ASH = 6;
const TOP = 200;
const BILLOW = 150;
const BOLT_MS = 170;
const PUFF = 0.75;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceVolcanicLightningEvent = registerWispEvent(
  KEY,
  "Volcanic Lightning",
  () => CONFIG.volcanicLightningEvent.chance,
  (floor, context, area) => {
    const { eruptMs, boltsMs, holdMs, mergeMs, levelShare } =
      CONFIG.volcanicLightningEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const crown: Point = { x: button.x, y: area.top + TOP };
    // the plume: ash wisps that billow up and out to spots round the crown
    const puffs = Array.from({ length: ASH }, (_, i) => {
      const spot: Point = {
        x: crown.x + (i / (ASH - 1) - 0.5) * BILLOW * 2,
        y: crown.y + Math.abs(i / (ASH - 1) - 0.5) * BILLOW * 0.8,
      };
      const at: Point = { x: 0, y: 0 };
      const delay = i * 40;
      return {
        spot,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - delay) / eruptMs));
          at.x = lerp([button.x, spot.x], u) + Math.sin(ms / 130 + i) * 10;
          at.y = lerp([button.y, spot.y], u) + Math.cos(ms / 110 + i * 2) * 8;
          return at;
        },
      };
    });
    let clock: number = eruptMs;
    const strikes: {
      bar: (typeof bars)[number];
      bolt: Bolt;
      hits: number;
      final: boolean;
    }[] = [];
    bars.forEach((bar, k) => {
      const from = puffs[(k * 2 + 1) % ASH].spot;
      strikes.push({
        bar,
        bolt: createBolt(from, bar.center, 2),
        hits: clock,
        final: false,
      });
      clock += lerp(boltsMs, k / Math.max(1, bars.length - 1));
    });
    const dischargeAt = clock;
    bars.forEach((bar, k) =>
      strikes.push({
        bar,
        bolt: createBolt(puffs[(k * 2) % ASH].spot, bar.center, 3),
        hits: dischargeAt,
        final: true,
      }),
    );
    const endAt = dischargeAt + BOLT_MS;

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), crown);
        if (s.final) {
          if (s === strikes[strikes.length - 1]) {
            for (const bar of bars) cover!.slam(bar);
            cover!.blast(s.bar.center);
          } else cover!.burst(s.bar.center, 1);
          return;
        }
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bars.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of puffs)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * PUFF,
              0.2,
              0,
              endAt,
            );
          for (const s of strikes) {
            const t = (ms - s.hits) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, s.final ? 1.4 : 1);
            drawStrike(ctx, s.bar.center, 1 - t, s.final ? 1.6 : 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
