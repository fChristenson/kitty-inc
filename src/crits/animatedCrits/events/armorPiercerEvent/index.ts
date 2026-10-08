// the "Armor Piercer" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a sniper wisp climbs out of the
// clicked floor's button to a top corner of the screen and fires heavy
// rounds that punch straight down through the whole stack of income bars in
// one long slanting line, every bar a round tears through flashing, banging
// and jolting as it lands free levels; each shot slants a little further
// and fires quicker, and the last punches through in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "armorPiercer";
const MAX_BARS = 5;
const SHOTS = 4;
const EDGE = 50;
const TOP = 140;
const CLIMB_MS = 260;
const SPEED = 2.8;
const SNIPER = 0.55;
const BULLET = WISP_SIZE * 0.4;
const MUZZLE = 70;
const FLASH_MS = 80;
const PIERCE_SHAKE: [number, number] = [0.4, 1.1];

export const forceArmorPiercerEvent = registerWispEvent(
  KEY,
  "Armor Piercer",
  () => CONFIG.armorPiercerEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.armorPiercerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = button.x > (area.left + area.right) / 2;
    const nest: Point = {
      x: left ? area.left + EDGE : area.right - EDGE,
      y: area.top + TOP,
    };
    const bottom = area.bottom - 20;
    const hits: { bar: RewardBar; at: Point; ms: number; share: number }[] = [];
    const rounds: Bullet[] = [];
    let clock: number = CLIMB_MS;
    for (let s = 0; s < SHOTS; s++) {
      // each round slants down across the stack to a spot on the bottom
      const end: Point = {
        x: lerp(
          [area.left + 80, area.right - 80],
          left ? 0.4 + 0.15 * s : 0.6 - 0.15 * s,
        ),
        y: bottom,
      };
      const b = aimBullet(nest, end, clock, SPEED);
      rounds.push(b);
      for (const bar of bars) {
        const u = (bar.center.y - nest.y) / (end.y - nest.y);
        if (u <= 0 || u >= 1) continue;
        hits.push({
          bar,
          at: { x: lerp([nest.x, end.x], u), y: bar.center.y },
          ms: b.firedAt + (b.hitAt - b.firedAt) * u,
          share: Math.max(1, Math.round(levelsFor(bar.floor) / SHOTS)),
        });
      }
      clock += lerp(shotsMs, s / (SHOTS - 1));
    }
    hits.sort((a, b) => a.ms - b.ms);
    const endAt = rounds[SHOTS - 1].hitAt;
    const sniperAt: Point = { x: 0, y: 0 };
    const sniper = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / CLIMB_MS));
      sniperAt.x = lerp([button.x, nest.x], u);
      sniperAt.y = lerp([button.y, nest.y], u);
      return sniperAt;
    };

    const piercing = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.levels(h.bar, h.share, nest);
        cover!.burst(h.at, 0.35);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(PIERCE_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(rounds[SHOTS - 1].to);
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
          piercing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, rounds, ms, now, BULLET, true);
          for (const b of rounds)
            drawMuzzleFlash(
              ctx,
              nest,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            sniper,
            ms,
            now,
            WISP_SIZE * SNIPER,
            0.7,
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
