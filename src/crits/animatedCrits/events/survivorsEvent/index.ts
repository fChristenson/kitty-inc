// the "Survivors" event (a bullet-heaven look, like Vampire Survivors; cash):
// it covers its crit, whose click freezes the screen while hordes of glitter
// stream in from every edge onto a hero wisp in the middle, which levels up
// its weapons as they close in: a gun picking them off one by one, then
// blades orbiting it, mowing down all that come near, then chain lightning
// leaping through the nearest, then a nova that wipes the whole horde off the
// screen; every kill a pop and a coin sucked into the hero, every level-up a
// blast, the hero bursting at the end. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawDetonation } from "../../../../shared/explosion";
import { drawBeam } from "../../../../shared/beam";
import { createBolt, drawBolt, type Bolt } from "../../../../shared/lightning";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";

const KEY = "survivors";
const REWARD = 4;
const FOES = 260;
const FOE = 26;
// the horde streams in from just past the screen's edges, closing in this fast
const EDGE = 60;
const CLOSE_MS: [number, number] = [900, 1400];
const NEAREST = 80;
const STEP_MS = 16;
// the gun fires this often; the blades orbit this far out (share of width)
const SHOT_MS = 96;
const SHOT_HIT_MS = 60;
const SHOT_W = 18;
const ORBIT = 0.18;
const ORBIT_REACH = 40;
const BLADES = 3;
const BLADE = 0.6;
const BLADE_SPIN = 0.012;
// chain lightning leaps through this many every CHAIN_MS
const CHAIN_MS = 160;
const CHAIN_HOPS = 7;
const CHAIN_FLASH_MS = 150;
// the nova's wave sweeps out to the farthest foe in this long
const NOVA_MS = 420;
const HERO = 1;
const HERO_GROW = 0.3;
const LEVEL_BLASTS = [160, 280, 420];
const FINALE_LAG = 250;
const KILL_SHAKE = 0.25;
const LEVEL_SHAKE = 1.2;
const NOVA_SHAKE = 1.8;
const SHAKE_GAP_MS = 45;
const SOUND_GAP_MS = 60;
const NOVA_GLOW = fadeStops(COLOR.heavenlyGold);

interface Foe {
  angle: number;
  from: number;
  speed: number;
  born: number;
  dies: number;
}

interface Chain {
  ms: number;
  bolts: Bolt[];
}

export const forceSurvivorsEvent = registerWispEvent(
  KEY,
  "Survivors",
  () => CONFIG.survivorsEvent.chance,
  (floor, context, area) => {
    const { hordeMs, orbitAtMs, chainAtMs, novaAtMs, holdMs, mergeMs } =
      CONFIG.survivorsEvent;
    const hero: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const halfW = (area.right - area.left) / 2;
    const halfH = (area.bottom - area.top) / 2;
    const orbitR = halfW * 2 * ORBIT;

    // each foe from just past the edge on its own heading, closing in
    const foes: Foe[] = Array.from({ length: FOES }, () => {
      const angle = Math.random() * Math.PI * 2;
      const from =
        Math.min(
          halfW / Math.max(1e-3, Math.abs(Math.cos(angle))),
          halfH / Math.max(1e-3, Math.abs(Math.sin(angle))),
        ) + EDGE;
      return {
        angle,
        from,
        speed: (from - orbitR) / lerp(CLOSE_MS, Math.random()),
        born: Math.random() * hordeMs,
        dies: Infinity,
      };
    });
    const radiusAt = (f: Foe, ms: number) =>
      Math.max(NEAREST, f.from - f.speed * (ms - f.born));
    const foeAt = (f: Foe, ms: number, into: Point): Point => {
      const r = radiusAt(f, ms);
      into.x = hero.x + Math.cos(f.angle) * r;
      into.y = hero.y + Math.sin(f.angle) * r;
      return into;
    };
    const alive = (ms: number) =>
      foes.filter((f) => f.born <= ms && f.dies > ms);
    const nearest = (ms: number, n: number) =>
      alive(ms)
        .sort((a, b) => radiusAt(a, ms) - radiusAt(b, ms))
        .slice(0, n);

    // who dies when, to each weapon in turn, simulated at arm
    const shots: { ms: number; to: Point }[] = [];
    const chains: Chain[] = [];
    for (let ms = 0; ms < novaAtMs; ms += STEP_MS) {
      if (ms < orbitAtMs && ms % SHOT_MS < STEP_MS)
        for (const f of nearest(ms, 1)) {
          f.dies = ms + SHOT_HIT_MS;
          shots.push({ ms, to: foeAt(f, f.dies, { x: 0, y: 0 }) });
        }
      if (ms >= orbitAtMs)
        for (const f of alive(ms))
          if (radiusAt(f, ms) < orbitR + ORBIT_REACH) f.dies = ms;
      if (ms >= chainAtMs && (ms - chainAtMs) % CHAIN_MS < STEP_MS) {
        const hit = nearest(ms, CHAIN_HOPS);
        let from = hero;
        const bolts: Bolt[] = [];
        for (const f of hit) {
          f.dies = ms;
          const to = foeAt(f, ms, { x: 0, y: 0 });
          bolts.push(createBolt(from, to, 0));
          from = to;
        }
        if (bolts.length) chains.push({ ms, bolts });
      }
    }
    // the nova's wave sweeps out over the rest
    const farthest = Math.max(
      orbitR,
      ...foes
        .filter((f) => f.dies === Infinity)
        .map((f) => radiusAt(f, novaAtMs)),
    );
    const novaSpeed = farthest / NOVA_MS;
    for (const f of foes)
      if (f.dies === Infinity)
        f.dies = Math.max(f.born, novaAtMs + radiusAt(f, novaAtMs) / novaSpeed);
    const finaleAt = Math.max(...foes.map((f) => f.dies)) + FINALE_LAG;
    const levelUps = [orbitAtMs, chainAtMs, novaAtMs];

    let shakeAt = -Infinity;
    let soundAt = -Infinity;
    const kick = (now: number, power: number) => {
      if (now - shakeAt < SHAKE_GAP_MS) return;
      shakeAt = now;
      shakeScreen(power);
    };
    const pop = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const spot: Point = { x: 0, y: 0 };
    const killing = createBeats(
      foes,
      (f) => f.dies,
      (f, _k, now) => {
        const at = foeAt(f, f.dies, { x: 0, y: 0 });
        cover!.burst(at, 0.15);
        cover!.launchFrom(at, [hero]);
        if (!cover!.isLive()) return;
        kick(now, KILL_SHAKE);
        pop(now);
      },
    );
    const chaining = createBeats(
      chains,
      (c) => c.ms,
      () => {
        if (cover!.isLive()) playExplosion();
      },
    );
    const levelling = createBeats(
      levelUps,
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(ms === novaAtMs ? NOVA_SHAKE : LEVEL_SHAKE);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => cover!.blast(hero),
    );

    const blades = Array.from({ length: BLADES }, (_, k) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const a = (ms - orbitAtMs) * BLADE_SPIN + (k * Math.PI * 2) / BLADES;
        p.x = hero.x + Math.cos(a) * orbitR;
        p.y = hero.y + Math.sin(a) * orbitR;
        return p;
      };
    });

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          killing.tick(ms, now);
          chaining.tick(ms, now);
          levelling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > finaleAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < foes.length; i++) {
            const f = foes[i];
            if (ms < f.born || ms >= f.dies) continue;
            foeAt(f, ms, spot);
            stampGlimmer(
              ctx,
              spot.x,
              spot.y,
              FOE,
              now * 0.004 + i,
              i % 4 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          const wave = (ms - novaAtMs) * novaSpeed;
          if (wave > 0 && wave < farthest * 1.2) {
            ctx.globalAlpha = 1 - wave / (farthest * 1.2);
            drawGlow(ctx, NOVA_GLOW, hero.x, hero.y, wave);
            ctx.globalAlpha = 1;
          }
          ctx.restore();
          for (const s of shots) {
            const t = (ms - s.ms) / (SHOT_HIT_MS * 1.5);
            if (t < 0 || t > 1) continue;
            drawBeam(ctx, hero, s.to, SHOT_W, 1 - t);
          }
          for (const blade of blades)
            drawWispBetween(
              ctx,
              blade,
              ms,
              now,
              WISP_SIZE * BLADE,
              0.5,
              orbitAtMs,
              novaAtMs,
            );
          for (const c of chains) {
            const a = 1 - (ms - c.ms) / CHAIN_FLASH_MS;
            if (a <= 0 || ms < c.ms) continue;
            for (const b of c.bolts) drawBolt(ctx, b, a, 0.9);
          }
          const level = levelUps.filter((l) => l <= ms).length;
          drawWisp(
            ctx,
            () => hero,
            ms,
            now,
            WISP_SIZE * (HERO + HERO_GROW * level),
            clamp01(level / levelUps.length),
          );
          levelUps.forEach((l, k) =>
            drawDetonation(ctx, hero, ms - l, LEVEL_BLASTS[k], now),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
