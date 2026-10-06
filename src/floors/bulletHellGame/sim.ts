import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { drawMuzzleFlash, type Box } from "../../shared/bullets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { drawBounceSplash, SPLASH_MS, type Bounce } from "../../shared/bounce";
import { between, clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { Track, TRACK_KEEP_MS } from "./track";
import { spawnWisps, splitWisp, wispRadius, type Wisp } from "./wisps";
import type { BulletHellGameConfig } from "./types";

// a bullet hell game's play, stepped at a fixed rate: wisps popping in and
// moving their game's way, the shots fired at them (straight, fanned,
// homing, ricocheting or cluster bombs) and the blasts they go out in

const STEP = 8;
// the first wisps pop in this quickly, before the steady spawning starts
const OPENERS = 3;
const OPENER_GAP_MS = 180;
const STOP_SPAWNING_MS = 600;
const POP = 90;
// a wisp shot down blows up this many times its own size
const KILL_BLAST = 1.8;
// a shot this close to a wisp's edge hits it; a bomb or bomblet this close
// goes off
const HIT = 46;
const NEAR_BOMB = 70;
const NEAR_BOMBLET = 40;
const BOMBLET_DRAG = 0.997;
const BOMBLET_SIZE = 0.6;
const FUSE_GLOW = 1.4;
const FLASH_MS = 90;
const MUZZLE = 70;
const SPLASH = 90;
const WISP_HEAT = 0.4;
// aiming prefers wisps no shot is chasing yet, then the nearest
const CHASE_PENALTY = 2000;
const LEAD_MS = 800;
// a held button's repeats may come this much early
const FIRE_SLACK = 0.8;
// homing missiles launch this far (rad) off straight up, alternating sides
const HOMING_FAN: [number, number] = [0.7, 1.1];

export interface BulletHellHooks {
  // a wisp shot down at `at`, its blast `size` px across
  hit(at: Point, size: number): void;
  // a bomb (or one of its bomblets) going off
  boom(at: Point, bomb: boolean): void;
  fired(): void;
}

export interface BulletHellSim {
  readonly hits: number;
  readonly lastShot: number;
  // queues a shot, fired on the next step the fire rate allows
  fire(): void;
  advance(ms: number): void;
  draw(ctx: CanvasRenderingContext2D, now: number): void;
}

interface Shot {
  track: Track;
  role: "shot" | "bomb" | "bomblet";
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dead: number | null;
  size: number;
  target: Wisp | null;
  bounces: number;
  pierce: number;
  struck: Wisp[];
  fuseAt: number;
  blast: number;
  from: Point;
  to: Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

// wisps fly inside `box`; shots fly (and ricochet) inside `shotBox`
export function createBulletHellSim(
  cfg: BulletHellGameConfig,
  box: Box,
  shotBox: Box,
  muzzle: Point,
  hooks: BulletHellHooks,
): BulletHellSim {
  const { wisps: wc, shots: sc, playMs } = cfg;
  let wisps: Wisp[] = [];
  let shots: Shot[] = [];
  let blasts: Blast[] = [];
  let splashes: Bounce[] = [];
  let hits = 0;
  let clock = 0;
  let nextSpawn = 0;
  let openers = 0;
  let spawned = 0;
  let lastShot = -Infinity;
  let lastAngle = -Math.PI / 2;
  let side = 1;
  let pending = false;
  let over = false;
  const fuse: Point = { x: 0, y: 0 };

  const living = (ms: number) =>
    wisps.reduce((n, w) => n + (w.dead === null && w.born <= ms ? 1 : 0), 0);

  const spawn = (ms: number) => {
    const pace =
      wc.move === "loop" ? 1 + (wc.speedUp - 1) * clamp01(ms / playMs) : 1;
    const group = spawnWisps(wc, box, ms, pace, spawned);
    spawned += group.length;
    for (const w of group) {
      wisps.push(w);
      blasts.push({ at: { x: w.x, y: w.y }, ms, size: POP * w.size });
    }
  };

  const kill = (w: Wisp, ms: number) => {
    if (w.dead !== null) return;
    w.dead = w.track.end = ms;
    hits++;
    const blast = {
      at: { x: w.x, y: w.y },
      ms,
      size: KILL_BLAST * WISP_SIZE * w.size,
    };
    blasts.push(blast);
    hooks.hit(blast.at, blast.size);
    if (w.gen < wc.split) wisps.push(...splitWisp(w, ms, box));
  };

  const pickTarget = (ms: number): Wisp | null => {
    let best: Wisp | null = null;
    let bestScore = Infinity;
    for (const w of wisps) {
      if (w.dead !== null || w.born > ms) continue;
      let chasing = 0;
      for (const s of shots) if (s.dead === null && s.target === w) chasing++;
      const score =
        chasing * CHASE_PENALTY + Math.hypot(w.x - muzzle.x, w.y - muzzle.y);
      if (score < bestScore) {
        bestScore = score;
        best = w;
      }
    }
    return best;
  };

  // where w will be when something flying at `speed` from the muzzle gets there
  const lead = (w: Wisp, speed: number, maxMs = LEAD_MS): Point => {
    let x = w.x;
    let y = w.y;
    for (let k = 0; k < 3; k++) {
      const t = Math.min(maxMs, Math.hypot(x - muzzle.x, y - muzzle.y) / speed);
      x = w.x + w.vx * t;
      y = w.y + w.vy * t;
    }
    return { x, y };
  };

  const angleTo = (p: Point) => Math.atan2(p.y - muzzle.y, p.x - muzzle.x);

  const newShot = (
    ms: number,
    role: Shot["role"],
    from: Point,
    angle: number,
    speed: number,
    size: number,
  ): Shot => {
    const shot: Shot = {
      track: new Track(),
      role,
      x: from.x,
      y: from.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: ms,
      dead: null,
      size: size * WISP_SIZE,
      target: null,
      bounces: 0,
      pierce: 1,
      struck: [],
      fuseAt: Infinity,
      blast: 0,
      from: { x: from.x, y: from.y },
      to: { x: from.x, y: from.y },
    };
    shot.track.push(ms, from.x, from.y);
    shots.push(shot);
    return shot;
  };

  const shoot = (ms: number) => {
    const target = pickTarget(ms);
    let angle = -Math.PI / 2;
    switch (sc.kind) {
      case "straight": {
        if (target) angle = angleTo(lead(target, sc.speed));
        angle += (Math.random() * 2 - 1) * sc.jitter;
        newShot(ms, "shot", muzzle, angle, sc.speed, sc.size).target = target;
        break;
      }
      case "spread": {
        if (target) angle = angleTo(lead(target, sc.speed));
        for (let i = 0; i < sc.pellets; i++) {
          const a =
            angle + sc.fan * (sc.pellets > 1 ? i / (sc.pellets - 1) - 0.5 : 0);
          const speed = sc.speed * (0.92 + 0.16 * Math.random());
          newShot(ms, "shot", muzzle, a, speed, sc.size).target = target;
        }
        break;
      }
      case "homing": {
        side = -side;
        angle = -Math.PI / 2 + side * between(HOMING_FAN);
        newShot(ms, "shot", muzzle, angle, sc.speed[0], sc.size).target =
          target;
        break;
      }
      case "bounce": {
        if (target) angle = angleTo(lead(target, sc.speed));
        const shot = newShot(ms, "shot", muzzle, angle, sc.speed, sc.size);
        shot.target = target;
        shot.bounces = sc.bounces;
        shot.pierce = sc.pierce;
        break;
      }
      case "cluster": {
        const to = target
          ? lead(target, 1, sc.fuseMs)
          : { x: muzzle.x, y: (box.top + box.bottom) / 2 };
        to.x = Math.min(box.right, Math.max(box.left, to.x));
        to.y = Math.min(box.bottom, Math.max(box.top, to.y));
        angle = angleTo(to);
        const bomb = newShot(ms, "bomb", muzzle, angle, 0, sc.size);
        bomb.target = target;
        bomb.to = to;
        bomb.fuseAt = ms + sc.fuseMs;
        bomb.blast = sc.blast;
        break;
      }
    }
    lastShot = ms;
    lastAngle = angle;
    hooks.fired();
  };

  const nearWisp = (x: number, y: number, reach: number) =>
    wisps.some(
      (w) =>
        w.dead === null && Math.hypot(w.x - x, w.y - y) < reach + wispRadius(w),
    );

  const end = (shot: Shot, ms: number) => {
    shot.dead = shot.track.end = ms;
  };

  const detonate = (shot: Shot, ms: number) => {
    end(shot, ms);
    const at = { x: shot.x, y: shot.y };
    blasts.push({ at, ms, size: shot.blast * 2 });
    hooks.boom(at, shot.role === "bomb");
    // a snapshot, so wisps split off by this blast aren't caught in it
    for (const w of wisps.slice())
      if (
        w.dead === null &&
        Math.hypot(w.x - at.x, w.y - at.y) < shot.blast + wispRadius(w)
      )
        kill(w, ms);
    if (shot.role !== "bomb" || sc.kind !== "cluster") return;
    const turn = Math.random() * Math.PI * 2;
    for (let i = 0; i < sc.bomblets; i++) {
      const a = turn + (i / sc.bomblets) * Math.PI * 2;
      const speed = sc.bombletSpeed * (0.8 + 0.4 * Math.random());
      const b = newShot(ms, "bomblet", at, a, speed, sc.size * BOMBLET_SIZE);
      b.fuseAt = ms + between(sc.bombletFuseMs);
      b.blast = sc.bombletBlast;
    }
  };

  const bounceOffWalls = (shot: Shot, ms: number) => {
    let normal: number | null = null;
    if (shot.x < shotBox.left) {
      shot.x = 2 * shotBox.left - shot.x;
      shot.vx = -shot.vx;
      normal = 0;
    } else if (shot.x > shotBox.right) {
      shot.x = 2 * shotBox.right - shot.x;
      shot.vx = -shot.vx;
      normal = Math.PI;
    }
    if (normal !== null) {
      shot.bounces--;
      splashes.push({ at: { x: shot.x, y: shot.y }, ms, normal });
      normal = null;
    }
    if (shot.y < shotBox.top) {
      shot.y = 2 * shotBox.top - shot.y;
      shot.vy = -shot.vy;
      normal = Math.PI / 2;
    } else if (shot.y > shotBox.bottom) {
      shot.y = 2 * shotBox.bottom - shot.y;
      shot.vy = -shot.vy;
      normal = -Math.PI / 2;
    }
    if (normal !== null) {
      shot.bounces--;
      splashes.push({ at: { x: shot.x, y: shot.y }, ms, normal });
    }
  };

  const stepShot = (shot: Shot, ms: number) => {
    if (shot.role === "bomb" && sc.kind === "cluster") {
      const u = clamp01((ms - shot.born) / (shot.fuseAt - shot.born));
      const e = easeOutCubic(u);
      shot.x = shot.from.x + (shot.to.x - shot.from.x) * e;
      shot.y =
        shot.from.y + (shot.to.y - shot.from.y) * e - sc.lift * 4 * u * (1 - u);
      shot.track.push(ms, shot.x, shot.y);
      if (u >= 1 || nearWisp(shot.x, shot.y, NEAR_BOMB)) detonate(shot, ms);
      return;
    }
    if (shot.role === "bomblet") {
      const drag = BOMBLET_DRAG ** STEP;
      shot.vx *= drag;
      shot.vy *= drag;
      shot.x += shot.vx * STEP;
      shot.y += shot.vy * STEP;
      shot.track.push(ms, shot.x, shot.y);
      if (ms >= shot.fuseAt || nearWisp(shot.x, shot.y, NEAR_BOMBLET))
        detonate(shot, ms);
      return;
    }
    if (sc.kind === "homing") {
      const age = ms - shot.born;
      if (age > sc.lifeMs) {
        end(shot, ms);
        blasts.push({ at: { x: shot.x, y: shot.y }, ms, size: POP });
        return;
      }
      if (!shot.target || shot.target.dead !== null)
        shot.target = pickTarget(ms);
      let heading = Math.atan2(shot.vy, shot.vx);
      if (shot.target) {
        let turn =
          Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x) - heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const most = sc.turn * STEP;
        heading += Math.max(-most, Math.min(most, turn));
      }
      const speed = lerp(sc.speed, clamp01(age / sc.accelMs));
      shot.vx = Math.cos(heading) * speed;
      shot.vy = Math.sin(heading) * speed;
    }
    shot.x += shot.vx * STEP;
    shot.y += shot.vy * STEP;
    if (sc.kind === "bounce") bounceOffWalls(shot, ms);
    shot.track.push(ms, shot.x, shot.y);
    if (
      shot.bounces < 0 ||
      shot.x < shotBox.left ||
      shot.x > shotBox.right ||
      shot.y < shotBox.top ||
      shot.y > shotBox.bottom
    )
      return end(shot, ms);
    for (const w of wisps) {
      if (w.dead !== null || w.born >= ms || shot.struck.includes(w)) continue;
      if (Math.hypot(w.x - shot.x, w.y - shot.y) > HIT + wispRadius(w))
        continue;
      shot.struck.push(w);
      kill(w, ms);
      if (--shot.pierce <= 0) return end(shot, ms);
    }
  };

  const step = (ms: number) => {
    if (ms <= playMs) {
      while (openers < OPENERS && ms >= openers * OPENER_GAP_MS) {
        spawn(ms);
        openers++;
        nextSpawn = ms + wc.spawnMs[0];
      }
      if (
        openers >= OPENERS &&
        ms >= nextSpawn &&
        ms < playMs - STOP_SPAWNING_MS &&
        living(ms) + wc.group <= wc.max
      ) {
        spawn(ms);
        nextSpawn = ms + lerp(wc.spawnMs, clamp01(ms / playMs));
      }
      if (pending && ms - lastShot >= sc.fireMs * FIRE_SLACK) {
        pending = false;
        shoot(ms);
      }
    } else if (!over) {
      over = true;
      pending = false;
      for (const w of wisps)
        if (w.dead === null) {
          w.dead = w.track.end = ms;
          blasts.push({ at: { x: w.x, y: w.y }, ms, size: POP });
        }
    }
    for (const w of wisps) {
      if (w.dead !== null) continue;
      w.move(ms, STEP);
      w.track.push(ms, w.x, w.y);
    }
    for (const shot of shots) if (shot.dead === null) stepShot(shot, ms);
  };

  return {
    get hits() {
      return hits;
    },
    get lastShot() {
      return lastShot;
    },
    fire: () => {
      if (!over) pending = true;
    },
    advance: (ms) => {
      if (clock + STEP > ms) return;
      while (clock + STEP <= ms) {
        clock += STEP;
        step(clock);
      }
      const gone = (dead: number | null) =>
        dead !== null && clock - dead >= TRACK_KEEP_MS;
      wisps = wisps.filter((w) => !gone(w.dead));
      shots = shots.filter((s) => !gone(s.dead));
      blasts = blasts.filter((b) => clock - b.ms < DETONATION_MS);
      splashes = splashes.filter((b) => clock - b.ms < SPLASH_MS);
    },
    draw: (ctx, now) => {
      const ms = clock;
      drawMuzzleFlash(
        ctx,
        muzzle,
        lastAngle,
        (ms - lastShot) / FLASH_MS,
        MUZZLE,
      );
      for (const w of wisps)
        drawWispBetween(
          ctx,
          w.track.at,
          ms,
          now,
          WISP_SIZE * w.size,
          WISP_HEAT,
          w.born,
          w.dead ?? Infinity,
        );
      for (const shot of shots) {
        if (shot.role !== "shot" && shot.dead === null) {
          fuse.x = shot.x;
          fuse.y = shot.y;
          drawLitFuse(
            ctx,
            fuse,
            (ms - shot.born) / (shot.fuseAt - shot.born),
            shot.size * FUSE_GLOW,
            now,
          );
        }
        drawWispBetween(
          ctx,
          shot.track.at,
          ms,
          now,
          shot.size,
          1,
          shot.born,
          shot.dead ?? Infinity,
        );
      }
      for (const b of splashes)
        drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
      for (const b of blasts) drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
    },
  };
}
