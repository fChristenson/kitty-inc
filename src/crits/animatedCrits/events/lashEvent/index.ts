// the "Lash" event (lightning; crit tiers): it covers its crit, whose click
// freezes the screen while a bolt of lightning uncoils out of the clicked
// floor's button like a whip and cracks out across the screen, its tip
// snapping onto an income bar in a blinding flash, a crack and a jolt, and
// the bar jumps a crit tier; it lashes back and cracks onto the next, ever
// faster, and the last crack lands in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";

const KEY = "lash";
const MAX_BARS = 3;
// each crack whips out over CRACK_MS, the tip arcing ARC px off the line
const CRACK_MS = 220;
const ARC = 120;
const CRACK_SHAKE: [number, number] = [0.8, 1.5];

export const forceLashEvent = registerWispEvent(
  KEY,
  "Lash",
  () => CONFIG.lashEvent.chance,
  (floor, context) => {
    const { windMs, cracksMs, holdMs, mergeMs } = CONFIG.lashEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = windMs;
    const cracks = bars.map((bar, k) => {
      const spot: Point = {
        x: bar.center.x + (k % 2 === 0 ? -1 : 1) * bar.box.width * 0.3,
        y: bar.center.y,
      };
      const lashes = clock;
      clock += lerp(cracksMs, k / Math.max(1, bars.length - 1));
      return { bar, spot, lashes, cracks: lashes + CRACK_MS };
    });
    const last = cracks[cracks.length - 1];
    const endAt = last.cracks;
    const tip: Point = { x: button.x, y: button.y };
    const whip = createBolt({ x: button.x, y: button.y }, tip, 0);
    const placeTip = (ms: number) => {
      let c = cracks[0];
      for (const crack of cracks) if (ms >= crack.lashes) c = crack;
      if (ms < c.lashes) {
        const u = clamp01(ms / windMs);
        tip.x = button.x + Math.sin(u * Math.PI * 4) * 40 * u;
        tip.y = button.y - 60 * u;
        return;
      }
      const u = clamp01((ms - c.lashes) / CRACK_MS);
      const reach = easeOutBack(u);
      const dx = c.spot.x - button.x;
      const dy = c.spot.y - button.y;
      const length = Math.hypot(dx, dy) || 1;
      tip.x =
        button.x + dx * reach + (-dy / length) * ARC * Math.sin(Math.PI * u);
      tip.y =
        button.y + dy * reach + (dx / length) * ARC * Math.sin(Math.PI * u);
    };

    const lashing = createBeats(
      cracks,
      (c) => c.lashes,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cracking = createBeats(
      cracks,
      (c) => c.cracks,
      (c, k) => {
        cover!.tierUp(c.bar, button);
        if (c === last) {
          cover!.slam(c.bar);
          cover!.blast(c.spot);
          return;
        }
        cover!.burst(c.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRACK_SHAKE, k / Math.max(1, cracks.length - 1)));
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
        tick: (ms, now) => {
          lashing.tick(ms, now);
          cracking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 250) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 250 : 1;
          placeTip(Math.min(ms, endAt));
          drawBolt(ctx, whip, 0.9 * fade, 0.8);
          for (const c of cracks) {
            const t = (ms - c.cracks) / 200;
            if (t >= 0 && t < 1) drawStrike(ctx, c.spot, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
