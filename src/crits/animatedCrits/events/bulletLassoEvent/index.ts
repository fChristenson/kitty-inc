// the "Bullet Lasso" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a gun wisp flies out of the clicked
// floor's button and circles an income bar in a tightening loop, firing a
// stream of bullet wisps inward as it goes; they hang where they stop, a
// spiralling loop of bullets cinching round the bar, and when it closes
// they all slam into the bar at once, a bang and a big jolt as it jumps a
// crit tier; bar after bar, each lasso quicker, the last cinch landing in a
// huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "bulletLasso";
const MAX_BARS = 3;
const SHOTS = 14;
// the loop's reach past the bar's ends and over/under it, tightening by TIGHTEN
const LOOP_X = 90;
const LOOP_Y = 110;
const TIGHTEN = 0.6;
const LAPS = 1.15;
// how far in each bullet flies before it hangs
const HANG = 0.6;
const IN_SPEED = 2.2;
const MOVE_MS = 130;
const CINCH_MS = 90;
const SLAM_MS = 120;
const FLASH_MS = 70;
const MUZZLE = 40;
const GUN = 0.5;
const BULLET = WISP_SIZE * 0.26;
const HIT_SHAKE: [number, number] = [1, 1.6];
const POP_GAP_MS = 60;

interface Lasso {
  bar: RewardBar;
  from: Point;
  moves: number;
  starts: number;
  ends: number;
  slams: number;
  // the gun's spot `u` 0..1 round the loop
  ring: (u: number, into: Point) => Point;
  stream: Bullet[];
  hangs: { at: Point; from: number; hold: () => Point }[];
  slam: Bullet[];
}

export const forceBulletLassoEvent = registerWispEvent(
  KEY,
  "Bullet Lasso",
  () => CONFIG.bulletLassoEvent.chance,
  (floor, context) => {
    const { loopsMs, holdMs, mergeMs } = CONFIG.bulletLassoEvent;
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
    const lassos: Lasso[] = bars.map((bar, k) => {
      const rx = bar.box.width / 2 + LOOP_X;
      const ry = bar.box.height / 2 + LOOP_Y;
      const turn = Math.atan2(from.y - bar.center.y, from.x - bar.center.x);
      const ring = (u: number, into: Point): Point => {
        const a = turn + u * LAPS * Math.PI * 2;
        const r = 1 - (1 - TIGHTEN) * u;
        into.x = bar.center.x + Math.cos(a) * rx * r;
        into.y = bar.center.y + Math.sin(a) * ry * r;
        return into;
      };
      const moves = clock;
      const starts = moves + MOVE_MS;
      const loopMs = lerp(loopsMs, k / Math.max(1, bars.length - 1));
      const ends = starts + loopMs;
      const cinch = ends + CINCH_MS;
      const slams = cinch + SLAM_MS;
      const stream: Bullet[] = [];
      const hangs: Lasso["hangs"] = [];
      const slam: Bullet[] = [];
      for (let i = 0; i < SHOTS; i++) {
        const u = (i + 0.5) / SHOTS;
        const fires = starts + loopMs * u;
        const gun = ring(u, { x: 0, y: 0 });
        const hang: Point = {
          x: lerp([gun.x, bar.center.x], HANG),
          y: lerp([gun.y, bar.center.y], HANG),
        };
        const shot = aimBullet(gun, hang, fires, IN_SPEED);
        stream.push(shot);
        hangs.push({ at: hang, from: shot.hitAt, hold: () => hang });
        // every hanging bullet slams onto the bar together
        const onto: Point = {
          x: Math.min(
            bar.box.x + bar.box.width - 10,
            Math.max(bar.box.x + 10, hang.x),
          ),
          y: bar.center.y,
        };
        const d = Math.hypot(onto.x - hang.x, onto.y - hang.y) || 1;
        slam.push(aimBullet(hang, onto, cinch, d / SLAM_MS));
      }
      clock = slams;
      const lasso = {
        bar,
        from,
        moves,
        starts,
        ends,
        slams,
        ring,
        stream,
        hangs,
        slam,
      };
      from = ring(1, { x: 0, y: 0 });
      return lasso;
    });
    const last = lassos[lassos.length - 1];
    const endAt = last.slams;
    const stream = lassos.flatMap((l) => l.stream);
    const slams = lassos.flatMap((l) => l.slam);
    const gunAt: Point = { x: 0, y: 0 };
    const startAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const t = Math.max(0, ms);
      let l = lassos[0];
      for (const lasso of lassos) if (t >= lasso.moves) l = lasso;
      if (t < l.starts) {
        l.ring(0, startAt);
        const u = easeOut(clamp01((t - l.moves) / MOVE_MS));
        gunAt.x = lerp([l.from.x, startAt.x], u);
        gunAt.y = lerp([l.from.y, startAt.y], u);
        return gunAt;
      }
      return l.ring(clamp01((t - l.starts) / (l.ends - l.starts)), gunAt);
    };
    let lastPop = -Infinity;

    const hanging = createBeats(
      stream,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.1);
        if (!cover!.isLive() || b.hitAt - lastPop < POP_GAP_MS) return;
        lastPop = b.hitAt;
        playBloop();
      },
    );
    const cinching = createBeats(
      lassos,
      (l) => l.slams,
      (l, k) => {
        cover!.tierUp(l.bar, l.bar.center);
        if (l === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(l.bar.center);
          return;
        }
        cover!.burst(l.bar.center, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, lassos.length - 1)));
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
          hanging.tick(ms, now);
          cinching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, stream, ms, now, BULLET);
          drawBullets(ctx, slams, ms, now, BULLET, true);
          for (const l of lassos) {
            if (ms < l.starts || ms >= l.slams) continue;
            const cinch = l.slams - SLAM_MS;
            for (const h of l.hangs)
              if (ms >= h.from && ms < cinch)
                drawWispHead(ctx, h.hold, ms, now, BULLET, 0.5);
            for (const b of l.stream)
              drawMuzzleFlash(
                ctx,
                b.from,
                Math.atan2(b.dy, b.dx),
                (ms - b.firedAt) / FLASH_MS,
                MUZZLE,
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
