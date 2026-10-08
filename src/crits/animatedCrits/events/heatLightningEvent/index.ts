// the "Heat Lightning" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while sheet lightning flickers silently
// across the top of the screen, bolts rippling sideways through the sky,
// brighter and brighter; with every big flash a bolt snaps down out of it
// onto an empty spot on a floor in view, a blinding flash, a crack and a
// jolt, and a new worker forms there; the flashes come ever faster, the last
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "heatLightning";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
// SHEETS sideways bolts across the sky band, each flickering FLICKER_MS
const SHEETS = 10;
const SKY: [number, number] = [120, 260];
const FLICKER_MS = 140;
const BOLT_MS = 220;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceHeatLightningEvent = registerWispEvent(
  KEY,
  "Heat Lightning",
  () => CONFIG.heatLightningEvent.chance,
  (floor, context, area) => {
    const { flickerMs, gapsMs, holdMs, mergeMs } = CONFIG.heatLightningEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const skyAt = () => area.top + lerp(SKY, Math.random());
    const sheets: { at: number; bolt: Bolt }[] = [];
    for (let i = 0; i < SHEETS; i++) {
      const x = area.left + Math.random() * width * 0.5;
      sheets.push({
        at: flickerMs * (i / SHEETS) ** 0.8,
        bolt: createBolt(
          { x, y: skyAt() },
          { x: x + width * (0.3 + 0.3 * Math.random()), y: skyAt() },
          2,
        ),
      });
    }
    let clock: number = flickerMs;
    const drops = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const at = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const sky: Point = {
        x: spot.x + (Math.random() - 0.5) * 160,
        y: skyAt(),
      };
      return {
        hire,
        spot,
        at,
        bolt: createBolt(sky, spot, 2),
        sheet: createBolt(
          { x: sky.x - width * 0.3, y: skyAt() },
          { x: sky.x + width * 0.3, y: skyAt() },
          3,
        ),
      };
    });
    const last = drops[drops.length - 1];
    const endAt = last.at;

    const dropping = createBeats(
      drops,
      (d) => d.at,
      (d, k) => {
        giveHire(d.hire);
        if (d === last) {
          cover!.blast(d.spot);
          return;
        }
        cover!.burst(d.spot, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, drops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => dropping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + BOLT_MS) return;
          for (const s of sheets) {
            const t = (ms - s.at) / FLICKER_MS;
            if (t >= 0 && t < 1)
              drawBolt(
                ctx,
                s.bolt,
                (1 - t) * clamp01(0.3 + ms / flickerMs) * Math.random(),
                0.6,
              );
          }
          for (const d of drops) {
            const t = (ms - d.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, d.sheet, (1 - t) * 0.7, 0.7);
            drawBolt(ctx, d.bolt, 1 - t, 1.2);
            drawStrike(ctx, d.spot, 1 - t, 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
