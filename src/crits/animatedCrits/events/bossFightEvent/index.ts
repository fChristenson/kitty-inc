// the "Boss Fight" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a huge boss wisp descends into the top of the
// screen and a little fighter wisp zips out of the clicked floor's button
// along the bottom; the boss sprays rings of wisp bullets down the screen
// as the fighter strafes side to side, hosing a stream of bullets up into
// it, ever faster, every hit a flash, a pop and coins knocked out of the
// boss, every ring it fires a boom and a jolt; then the boss blows apart in
// a huge blast and shake. Pays floor income × floor number × REWARD
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
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  bulletRing,
  drawBullets,
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bossFight";
const REWARD = 4;
// the boss hangs HIGH of the way down, drifting DRIFT px; the fighter flies
// LOW of the way down, strafing STRAFE of the screen's half-width
const HIGH = 0.22;
const DRIFT = 60;
const LOW = 0.86;
const STRAFE = 0.7;
const RINGS = 3;
const RING = 18;
const RING_SPEED = 0.9;
const SHOT_SPEED = 2.6;
const FIRE_MS: [number, number] = [90, 35];
const BOSS = 1.6;
const FIGHTER = 0.5;
const SHOT = WISP_SIZE * 0.28;
const ENEMY = WISP_SIZE * 0.4;
const HIT_COINS = 2;
const HIT_REACH: [number, number] = [20, 70];
const RING_SHAKE = 0.9;

export const forceBossFightEvent = registerWispEvent(
  KEY,
  "Boss Fight",
  () => CONFIG.bossFightEvent.chance,
  (floor, context, area) => {
    const { enterMs, fightMs, holdMs, mergeMs } = CONFIG.bossFightEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const half = (area.right - area.left) / 2;
    const bossHome: Point = {
      x: cx,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    const fighterY = area.top + (area.bottom - area.top) * LOW;
    const bossPos = (ms: number, into: Point): Point => {
      const u = easeOut(Math.min(1, ms / enterMs));
      into.x = bossHome.x + Math.sin(ms / 400) * DRIFT;
      into.y = lerp([area.top - 80, bossHome.y], u);
      return into;
    };
    const fighterPos = (ms: number, into: Point): Point => {
      const u = easeOut(Math.min(1, ms / enterMs));
      into.x = lerp([button.x, cx + Math.sin(ms / 300) * half * STRAFE], u);
      into.y = lerp([button.y, fighterY], u);
      return into;
    };
    const blowAt = enterMs + fightMs;
    // the fighter's stream, quickening
    const shots: Bullet[] = [];
    for (let ms: number = enterMs; ms < blowAt - 150; ) {
      const from = fighterPos(ms, { x: 0, y: 0 });
      const guess = bossPos(ms + 250, { x: 0, y: 0 });
      guess.x += (Math.random() - 0.5) * 30;
      shots.push(aimBullet(from, guess, ms, SHOT_SPEED));
      ms += lerp(FIRE_MS, (ms - enterMs) / fightMs);
    }
    const rings = Array.from({ length: RINGS }, (_, k) => {
      const at = enterMs + (fightMs * (k + 0.5)) / RINGS;
      return {
        at,
        bullets: bulletRing(
          bossPos(at, { x: 0, y: 0 }),
          RING,
          at,
          RING_SPEED,
          area,
          k * 0.3,
        ),
      };
    });
    const enemy = rings.flatMap((r) => r.bullets);
    const endAt = blowAt;
    const bossAt: Point = { x: 0, y: 0 };
    const boss = (ms: number) => (ms > endAt ? null : bossPos(ms, bossAt));
    const fighterAt: Point = { x: 0, y: 0 };
    const fighter = (ms: number) =>
      ms > endAt + 300 ? null : fighterPos(ms, fighterAt);

    const hitting = createBeats(
      shots,
      (b) => b.hitAt,
      (b, k) => {
        cover!.burst(b.to, 0.15);
        cover!.launchFrom(b.to, ringTargets(b.to, HIT_COINS, HIT_REACH));
        if (cover!.isLive() && k % 4 === 0) shakeScreen(0.25);
      },
    );
    const ringing = createBeats(
      rings,
      (r) => r.at,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(RING_SHAKE);
      },
    );
    const finale = createBeats(
      [blowAt],
      (ms) => ms,
      () => cover!.blast(bossPos(blowAt, { x: 0, y: 0 })),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          ringing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, enemy, ms, now, ENEMY);
          drawBullets(ctx, shots, ms, now, SHOT);
          const heat = Math.min(1, ms / endAt);
          drawWispBetween(ctx, boss, ms, now, WISP_SIZE * BOSS, heat, 0, endAt);
          drawWispBetween(
            ctx,
            fighter,
            ms,
            now,
            WISP_SIZE * FIGHTER,
            0.6,
            0,
            endAt + 300,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
