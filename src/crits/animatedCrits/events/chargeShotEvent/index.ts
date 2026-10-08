// the "Charge Shot" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a gun wisp flies out of the clicked
// floor's button beside an income bar and starts charging: it rattles
// little shots into the bar as a huge round swells at its muzzle and the
// screen rumbles harder and harder; then it fires the charged shot, which
// smashes into the bar with a flash, a bang and a big jolt as the bar jumps
// a crit tier; bar after bar, each charge quicker, the last shot landing in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "chargeShot";
const MAX_BARS = 3;
const SIDE = 230;
const MOVE_MS = 180;
const SHOT_MS = 150;
const PEPPER = 5;
const SPEED = 2.6;
const RUMBLE_MS = 70;
const FLASH_MS = 120;
const GUN = 0.5;
const ROUND = 1.1;
const BULLET = WISP_SIZE * 0.28;
const HIT_SHAKE: [number, number] = [1, 1.6];
const BANG_GAP_MS = 60;

export const forceChargeShotEvent = registerWispEvent(
  KEY,
  "Charge Shot",
  () => CONFIG.chargeShotEvent.chance,
  (floor, context) => {
    const { chargeMs, holdMs, mergeMs } = CONFIG.chargeShotEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const shots = bars.map((bar, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      const post: Point = {
        x: bar.center.x + side * (bar.box.width / 2 + SIDE),
        y: bar.center.y - 40,
      };
      const moves = clock;
      const charges = moves + MOVE_MS;
      const fires = charges + lerp(chargeMs, k / Math.max(1, bars.length - 1));
      const hits = fires + SHOT_MS;
      clock = hits;
      const pepper: Bullet[] = Array.from({ length: PEPPER }, (_, i) =>
        aimBullet(
          post,
          {
            x: bar.box.x + bar.box.width * (0.15 + 0.7 * Math.random()),
            y: bar.center.y,
          },
          charges + ((fires - charges) * (i + 0.5)) / PEPPER,
          SPEED,
        ),
      );
      const round: Point = { x: 0, y: 0 };
      const shot = {
        bar,
        post,
        from,
        moves,
        charges,
        fires,
        hits,
        pepper,
        angle: Math.atan2(bar.center.y - post.y, bar.center.x - post.x),
        round: (ms: number): Point => {
          const u = easeIn(clamp01((ms - fires) / SHOT_MS));
          round.x = lerp([post.x, bar.center.x], u);
          round.y = lerp([post.y, bar.center.y], u);
          return round;
        },
      };
      from = post;
      return shot;
    });
    const last = shots[shots.length - 1];
    const endAt = last.hits;
    const pepper = shots.flatMap((s) => s.pepper);
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.moves) s = shot;
      const u = easeOut(clamp01((ms - s.moves) / MOVE_MS));
      // it kicks back as the charged round leaves
      const kick =
        ms >= s.fires ? Math.max(0, 1 - (ms - s.fires) / 150) * 20 : 0;
      gunAt.x = lerp([s.from.x, s.post.x], u) - Math.cos(s.angle) * kick;
      gunAt.y = lerp([s.from.y, s.post.y], u) - Math.sin(s.angle) * kick;
      return gunAt;
    };
    let lastRumble = -Infinity;
    let lastBang = -Infinity;

    const peppering = createBeats(
      pepper,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.25);
        if (!cover!.isLive() || b.hitAt - lastBang < BANG_GAP_MS) return;
        lastBang = b.hitAt;
        playBloop();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.tierUp(s.bar, s.post);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
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
          peppering.tick(ms, now);
          hitting.tick(ms, now);
          for (const s of shots) {
            if (
              ms < s.charges ||
              ms >= s.fires ||
              now - lastRumble < RUMBLE_MS ||
              !cover?.isLive()
            )
              continue;
            lastRumble = now;
            shakeScreen(0.2 + 0.7 * ((ms - s.charges) / (s.fires - s.charges)));
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, pepper, ms, now, BULLET);
          for (const s of shots) {
            if (ms >= s.charges && ms < s.fires) {
              // the round swelling at the muzzle
              const grow = (ms - s.charges) / (s.fires - s.charges);
              drawWispHead(
                ctx,
                s.round,
                ms,
                now,
                WISP_SIZE * ROUND * grow,
                grow,
              );
            }
            drawWispBetween(
              ctx,
              s.round,
              ms,
              now,
              WISP_SIZE * ROUND,
              1,
              s.fires,
              s.hits,
            );
            drawMuzzleFlash(
              ctx,
              s.post,
              s.angle,
              (ms - s.fires) / FLASH_MS,
              120,
            );
          }
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
