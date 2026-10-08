// the "Tight Group" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a sharpshooter at the screen's edge puts
// shot after shot through the very same spot on an income bar, muzzle
// flash after muzzle flash, every hit a pop and the spot glowing hotter and
// wider; on the last shot of the group the bar jumps a crit tier with a
// flare, a bang and a jolt, and the gun swings to the next bar, grouping
// quicker each time, the last in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeamFlare } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "tightGroup";
const MAX_BARS = 4;
const SHOTS = 6;
const EDGE = 40;
const SPEED = 3.2;
const SPOT = 0.3;
const GLOW: [number, number] = [14, 60];
const GLOW_FADE_MS = 300;
const BULLET = 0.45;
const FLASH_MS = 80;
const FLASH = 80;
const RATTLE_GAP_MS = 50;
const HIT_SHAKE = 0.25;
const GROUP_SHAKE: [number, number] = [0.7, 1.4];

interface Group {
  bar: RewardBar;
  spot: Point;
  shots: Bullet[];
  angle: number;
  done: number;
}

export const forceTightGroupEvent = registerWispEvent(
  KEY,
  "Tight Group",
  () => CONFIG.tightGroupEvent.chance,
  (floor, context, area) => {
    const { firstMs, shotGapMs, groupsMs, holdMs, mergeMs } =
      CONFIG.tightGroupEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock: number = firstMs;
    const groups: Group[] = bars.map((bar, k) => {
      const spot: Point = {
        x: bar.box.x + bar.box.width * (0.5 + (Math.random() - 0.5) * 2 * SPOT),
        y: bar.center.y,
      };
      // from whichever edge is farther, a little above or below the bar
      const gun: Point = {
        x:
          spot.x > (area.left + area.right) / 2
            ? area.left + EDGE
            : area.right - EDGE,
        y: spot.y + (k % 2 === 0 ? -1 : 1) * 120,
      };
      const gap = lerp(shotGapMs, k / Math.max(1, bars.length - 1));
      const shots = Array.from({ length: SHOTS }, (_, i) =>
        aimBullet(gun, spot, clock + i * gap, SPEED),
      );
      const group: Group = {
        bar,
        spot,
        shots,
        angle: Math.atan2(spot.y - gun.y, spot.x - gun.x),
        done: shots[SHOTS - 1].hitAt,
      };
      clock += lerp(groupsMs, k / Math.max(1, bars.length - 1));
      return group;
    });
    const last = groups[groups.length - 1];
    const endAt = last.done;
    const bullets = groups.flatMap((g) => g.shots);
    const hits = groups.flatMap((g) =>
      g.shots.slice(0, -1).map((b) => ({ g, ms: b.hitAt })),
    );
    let lastRattle = -Infinity;

    const popping = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        cover!.burst(h.g.spot, 0.2);
        if (!cover!.isLive()) return;
        shakeScreen(HIT_SHAKE);
        if (h.ms - lastRattle >= RATTLE_GAP_MS) {
          lastRattle = h.ms;
          playBloop();
        }
      },
    );
    const grouping = createBeats(
      groups,
      (g) => g.done,
      (g, k) => {
        cover!.tierUp(g.bar, g.spot);
        if (g === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(g.spot);
          return;
        }
        cover!.burst(g.spot, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GROUP_SHAKE, k / Math.max(1, groups.length - 1)));
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
          popping.tick(ms, now);
          grouping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + GLOW_FADE_MS) return;
          for (const g of groups) {
            // the spot glows hotter with every shot through it
            let landed = 0;
            for (const b of g.shots) if (ms >= b.hitAt) landed++;
            const fade = ms > g.done ? 1 - (ms - g.done) / GLOW_FADE_MS : 1;
            if (landed > 0 && fade > 0)
              drawBeamFlare(ctx, g.spot, lerp(GLOW, landed / SHOTS), fade, now);
            for (const b of g.shots) {
              const t = (ms - b.firedAt) / FLASH_MS;
              if (t > 0 && t < 1)
                drawMuzzleFlash(ctx, b.from, g.angle, t, FLASH);
            }
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
