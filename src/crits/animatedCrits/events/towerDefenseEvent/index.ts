// the "Tower Defense" event (gunfire; cash): it covers its crit, whose
// click freezes the screen while a column of creep wisps marches in along
// a winding road across the screen, and gun towers at its bends open up on
// them, muzzles flashing, every creep they gun down popping in a burst of
// cash with a jolt, the creeps coming ever thicker and faster; last comes a
// big boss creep that soaks up shot after shot from every tower until it
// blows in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";

const KEY = "towerDefense";
const REWARD = 4;
const CREEPS = 14;
const BOSS_HITS = 6;
// the road's bends and the towers beside them, as shares of the screen
const ROAD: Point[] = [
  { x: -0.05, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.45 },
  { x: 0.2, y: 0.45 },
  { x: 0.2, y: 0.7 },
  { x: 1.05, y: 0.7 },
];
const TOWERS: Point[] = [
  { x: 0.65, y: 0.32 },
  { x: 0.35, y: 0.32 },
  { x: 0.5, y: 0.58 },
  { x: 0.8, y: 0.82 },
];
// how far along the road (0..1) the creeps fall, the first to the last
const FALLS: [number, number] = [0.12, 0.85];
const FLIGHT_MS = 110;
const FLASH_MS = 70;
const CREEP = 0.32;
const BOSS = 0.7;
const TOWER = 0.4;
const POP = 130;
const COINS = 10;
const BANG_GAP_MS = 45;
const KILL_SHAKE: [number, number] = [0.2, 0.6];
const BOSS_SHAKE = 0.5;

interface Creep {
  spawns: number;
  falls: number;
  boss: boolean;
  at: (ms: number) => Point | null;
}

export const forceTowerDefenseEvent = registerWispEvent(
  KEY,
  "Tower Defense",
  () => CONFIG.towerDefenseEvent.chance,
  (floor, context, area) => {
    const { walkMs, spawnsMs, holdMs, mergeMs } = CONFIG.towerDefenseEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const place = (p: Point): Point => ({
      x: area.left + width * p.x,
      y: area.top + height * p.y,
    });
    const road = ROAD.map(place);
    const towers = TOWERS.map(place);
    const walkAt = (u: number, into: Point) => alongRoute(road, u, into);
    let clock = 0;
    const creeps: Creep[] = Array.from({ length: CREEPS + 1 }, (_, i) => {
      const boss = i === CREEPS;
      const spawns = clock;
      clock += lerp(spawnsMs, i / CREEPS);
      const fall = boss ? FALLS[1] : lerp(FALLS, Math.random() * 0.8);
      const spot: Point = { x: 0, y: 0 };
      const falls = spawns + fall * walkMs;
      return {
        spawns,
        falls,
        boss,
        at: (ms) =>
          ms < spawns || ms > falls
            ? null
            : walkAt((ms - spawns) / walkMs, spot),
      };
    });
    const boss = creeps[CREEPS];
    const nearest = (p: Point) =>
      towers.reduce((a, b) =>
        Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y)
          ? b
          : a,
      );
    // a shot per creep from the tower nearest where it falls; the boss
    // takes a volley from every tower
    const shots: { bullet: Bullet; creep: Creep; kills: boolean }[] = [];
    const into: Point = { x: 0, y: 0 };
    for (const c of creeps) {
      const hits = c.boss ? BOSS_HITS : 1;
      for (let h = 0; h < hits; h++) {
        const ms = c.falls - (hits - 1 - h) * 70;
        const to = { ...walkAt((ms - c.spawns) / walkMs, into) };
        const from = c.boss ? towers[h % towers.length] : nearest(to);
        const reach = Math.hypot(to.x - from.x, to.y - from.y);
        shots.push({
          bullet: aimBullet(from, to, ms - FLIGHT_MS, reach / FLIGHT_MS),
          creep: c,
          kills: h === hits - 1,
        });
      }
    }
    const bullets = shots.map((s) => s.bullet);
    const kills = shots.filter((s) => s.kills && !s.creep.boss);
    const endAt = boss.falls;

    let bang = -Infinity;
    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        const at = s.bullet.to;
        if (s.creep === boss) {
          if (s.kills) {
            cover!.blast(at);
            return;
          }
          cover!.burst(at, 0.4);
          if (!cover!.isLive()) return;
          playBloop();
          shakeScreen(BOSS_SHAKE);
          return;
        }
        cover!.launchFrom(
          at,
          clampTargetsY(
            ringTargets(at, COINS, [30, 140]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        shakeScreen(lerp(KILL_SHAKE, k / shots.length));
        if (s.bullet.hitAt - bang < BANG_GAP_MS) return;
        bang = s.bullet.hitAt;
        playExplosion();
      },
    );
    const towerAt = towers.map((t) => () => t);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 800) return;
          for (const t of towerAt)
            drawWispHead(ctx, t, ms, now, WISP_SIZE * TOWER, 0.6);
          for (const c of creeps)
            if (ms >= c.spawns && ms <= c.falls)
              drawWispHead(
                ctx,
                c.at,
                ms,
                now,
                WISP_SIZE * (c.boss ? BOSS : CREEP),
                c.boss ? 1 : 0.3,
              );
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.25);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t >= 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, 46);
          }
          for (const s of kills)
            drawDetonation(ctx, s.bullet.to, ms - s.bullet.hitAt, POP, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
