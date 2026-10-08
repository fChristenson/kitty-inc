// the "Hot Potato" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while the clicked floor's button tosses out one
// lit bomb wisp, its fuse fizzing and blinking; it hops from empty spot to
// empty spot across the floors in view like a hot potato, each landing a
// white blast, a bang and a jolt as a new worker forms there, every hop
// quicker and lower and the fuse blinking ever faster; at the last spot it
// finally goes off in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "hotPotato";
const MAX_HIRES = 6;
const FORM_MS = 300;
// each hop arcs HOP px high, shrinking to the last
const HOP: [number, number] = [220, 90];
const LIFT = 40;
const BOMB = 0.45;
const FUSE = 24;
const BLAST = 130;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceHotPotatoEvent = registerWispEvent(
  KEY,
  "Hot Potato",
  () => CONFIG.hotPotatoEvent.chance,
  (floor, context) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.hotPotatoEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const hops = hires.map((hire, k) => {
      const u = k / Math.max(1, hires.length - 1);
      const to: Point = { x: hire.x, y: hire.y - LIFT };
      const leaves = clock;
      clock += lerp(hopsMs, u);
      const hop = {
        hire,
        from,
        to,
        leaves,
        lands: clock,
        height: lerp(HOP, u),
      };
      from = to;
      return hop;
    });
    const last = hops[hops.length - 1];
    const endAt = last.lands;
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point | null => {
      if (ms >= endAt) return null;
      for (const h of hops) {
        if (ms >= h.lands) continue;
        const t = clamp01((ms - h.leaves) / (h.lands - h.leaves));
        bombAt.x = lerp([h.from.x, h.to.x], t);
        bombAt.y =
          lerp([h.from.y, h.to.y], t) - Math.sin(Math.PI * t) * h.height;
        return bombAt;
      }
      return null;
    };

    const landing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        giveHire(h.hire);
        if (h === last) {
          cover!.blast(h.to);
          return;
        }
        cover!.burst(h.to, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, hops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          for (const h of hops)
            if (h !== last) drawDetonation(ctx, h.to, ms - h.lands, BLAST, now);
          const p = bomb(ms);
          if (p) drawLitFuse(ctx, p, clamp01(ms / endAt), FUSE, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * BOMB, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
