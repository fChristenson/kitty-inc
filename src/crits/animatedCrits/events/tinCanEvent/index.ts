// the "Tin Can" event (gunfire; crit tiers): it covers its crit, whose click
// freezes the screen while a can wisp is flicked up out of the clicked
// floor's button and a gunner wisp at the side of the screen shoots it, and
// shoots it again, every hit a flash, a ping and a jolt, keeping it hopping
// through the air in high bounces; each time it's knocked down onto an
// income bar the bar jumps a crit tier with a bang and a big jolt, and it's
// shot back up; the last knock-down ends in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
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
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "tinCan";
const MAX_BARS = 3;
const EDGE = 50;
const HOP = 140;
const SPEED = 2.6;
const CAN = 0.4;
const GUNNER = 0.55;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 46;
const FLASH_MS = 60;
const PING_SHAKE = 0.4;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceTinCanEvent = registerWispEvent(
  KEY,
  "Tin Can",
  () => CONFIG.tinCanEvent.chance,
  (floor, context, area) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.tinCanEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const gunner: Point = {
      x:
        button.x > (area.left + area.right) / 2
          ? area.left + EDGE
          : area.right - EDGE,
      y: (area.top + area.bottom) / 2,
    };
    // where it's hit: a mid-air ping, then a knock-down onto each bar
    const marks: { at: Point; bar: RewardBar | null }[] = [];
    for (const bar of bars) {
      marks.push({
        at: {
          x: lerp([gunner.x, bar.center.x], 0.6) + (Math.random() - 0.5) * 80,
          y: bar.center.y - 200,
        },
        bar: null,
      });
      marks.push({ at: bar.center, bar });
    }
    let clock = 0;
    let from: Point = button;
    const hops = marks.map((m, k) => {
      const leaves = clock;
      clock += lerp(hopsMs, k / Math.max(1, marks.length - 1));
      const hop = {
        ...m,
        from,
        leaves,
        lands: clock,
        shot: aimBullet(
          gunner,
          m.at,
          clock - Math.hypot(m.at.x - gunner.x, m.at.y - gunner.y) / SPEED,
          SPEED,
        ) as Bullet,
      };
      from = m.at;
      return hop;
    });
    const knocks = hops.filter((h) => h.bar !== null);
    const last = knocks[knocks.length - 1];
    const endAt = last.lands;
    const bullets = hops.map((h) => h.shot);
    const gunnerSpot = () => gunner;
    const canAt: Point = { x: 0, y: 0 };
    const can = (ms: number): Point => {
      let h = hops[0];
      for (const hop of hops) if (ms >= hop.leaves) h = hop;
      const u = clamp01((ms - h.leaves) / (h.lands - h.leaves));
      canAt.x = lerp([h.from.x, h.at.x], u);
      canAt.y = lerp([h.from.y, h.at.y], u) - Math.sin(Math.PI * u) * HOP;
      return canAt;
    };

    const hitting = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        if (!h.bar) {
          cover!.burst(h.at, 0.25);
          if (!cover!.isLive()) return;
          playBloop();
          shakeScreen(PING_SHAKE);
          return;
        }
        cover!.tierUp(h.bar, gunner);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.at);
          return;
        }
        cover!.burst(h.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hops.length - 1)));
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
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              gunner,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(ctx, can, ms, now, WISP_SIZE * CAN, 0.7, 0, endAt);
          drawWispBetween(
            ctx,
            gunnerSpot,
            ms,
            now,
            WISP_SIZE * GUNNER,
            0.6,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
