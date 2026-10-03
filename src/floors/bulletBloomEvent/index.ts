// the "Bullet Bloom" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a boss wisp rises out of the clicked floor's
// button to the middle of the screen and fires a ring of wisp bullets that
// stop dead in a circle round it, hang there a beat, then each bursts into
// its own ring of bullets like a flower opening; wave after wave, each
// turned between the last and blooming wider, every petal popping into
// coins at the screen's edge; the boss blows in a huge blast and shake,
// firing one last ring every way. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  bulletRing,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";

const KEY = "bulletBloom";
const REWARD = 4;
const EDGE = 20;
// each wave: BUDS bullets out to a circle BLOOM px round the boss, each
// bursting into PETALS
const BUDS = 8;
const PETALS = 6;
const BLOOM: [number, number] = [110, 190];
const BUD_SPEED = 1.2;
const PETAL_SPEED = 1.6;
const RING = 32;
const RING_SPEED = 2.2;
const BOSS = 1;
const BUD = WISP_SIZE * 0.42;
const PETAL = WISP_SIZE * 0.28;
const MUZZLE = 60;
const FLASH_MS = 90;
const BLOOM_SHAKE: [number, number] = [0.5, 1.2];

export const forceBulletBloomEvent = registerWispEvent(
  KEY,
  "Bullet Bloom",
  () => CONFIG.bulletBloomEvent.chance,
  (floor, context, area) => {
    const { riseMs, wavesMs, hangMs, holdMs, mergeMs } =
      CONFIG.bulletBloomEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const boss: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const buds: Bullet[] = [];
    const petals: Bullet[] = [];
    const waves: { fires: number; blooms: number }[] = [];
    let clock: number = riseMs;
    for (let w = 0; w < wavesMs.length; w++) {
      const fires = clock;
      const radius = lerp(BLOOM, w / Math.max(1, wavesMs.length - 1));
      const turn = (w * Math.PI) / BUDS;
      let blooms = fires;
      for (let i = 0; i < BUDS; i++) {
        const a = turn + (i / BUDS) * Math.PI * 2;
        const spot: Point = {
          x: boss.x + Math.cos(a) * radius,
          y: boss.y + Math.sin(a) * radius,
        };
        const bud = aimBullet(boss, spot, fires, BUD_SPEED);
        buds.push(bud);
        blooms = bud.hitAt + hangMs;
        petals.push(...bulletRing(spot, PETALS, blooms, PETAL_SPEED, box, a));
      }
      waves.push({ fires, blooms });
      clock += wavesMs[w];
    }
    const ringAt = clock;
    const ring = bulletRing(boss, RING, ringAt, RING_SPEED, box);
    const shots = [...petals, ...ring];
    const endAt = Math.max(...shots.map((b) => b.hitAt));
    // the buds hang where they stopped until they bloom
    const hung = buds.map((b) => ({
      at: () => b.to,
      from: b.hitAt,
      to: b.hitAt + hangMs,
    }));
    const bossAt: Point = { x: 0, y: 0 };
    const bossWisp = (ms: number): Point | null => {
      if (ms >= ringAt) return null;
      const u = easeOut(Math.min(1, ms / riseMs));
      bossAt.x = lerp([button.x, boss.x], u);
      bossAt.y = lerp([button.y, boss.y], u);
      return bossAt;
    };

    const popping = createBeats(
      shots,
      (b) => b.hitAt,
      (b) =>
        cover!.launchFrom(b.to, [
          { x: b.to.x - b.dx * 60, y: b.to.y - b.dy * 60 },
        ]),
    );
    const blooming = createBeats(
      waves,
      (w) => w.blooms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLOOM_SHAKE, k / Math.max(1, waves.length - 1)));
      },
    );
    const finale = createBeats(
      [ringAt],
      (ms) => ms,
      () => cover!.blast(boss),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          blooming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, shots, ms, now, PETAL);
          drawBullets(ctx, buds, ms, now, BUD, true);
          for (const h of hung)
            drawWispBetween(ctx, h.at, ms, now, BUD, 0.8, h.from, h.to);
          for (const w of waves)
            drawMuzzleFlash(
              ctx,
              boss,
              -Math.PI / 2,
              (ms - w.fires) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            bossWisp,
            ms,
            now,
            WISP_SIZE * BOSS,
            0.8,
            0,
            ringAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
