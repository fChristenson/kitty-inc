// the "Gear Train" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while gears of blazing beams clank into place one
// after another in a chain from the clicked floor's button up to the
// building's locked floor, each meshing with the last with a clank and a
// jolt and spinning up; the whole train whirls faster and faster until the
// last gear wrenches the lock round and it bursts in a colossal blast and
// shake, the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "gearTrain";
const MAX_GEARS = 7;
const SPACING = 170;
// alternate gears' share of the gap between centres, so neighbours mesh
const BIG = 0.58;
const RIM = 12;
const SPOKES = 3;
const TEETH = 8;
const TOOTH = 0.22;
const BEAM = 8;
const POP_MS = 140;
// radians per ms the first gear turns, spinning up to SPIN_UP times that
const SPIN = 0.004;
const SPIN_UP = 4;
const CLANK_SHAKE: [number, number] = [0.3, 0.8];

export const forceGearTrainEvent = registerWispEvent(
  KEY,
  "Gear Train",
  () => CONFIG.gearTrainEvent.chance,
  (floor, context) => {
    const { clanksMs, whirlMs, holdMs, mergeMs } = CONFIG.gearTrainEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const length = Math.hypot(lock.x - button.x, lock.y - button.y);
    const count = Math.max(
      3,
      Math.min(MAX_GEARS, Math.round(length / SPACING) + 1),
    );
    const gap = length / (count - 1);
    let clock = 0;
    const gears = Array.from({ length: count }, (_, k) => {
      const t = k / (count - 1);
      const radius = gap * (k % 2 === 0 ? BIG : 1 - BIG);
      const pops = clock;
      clock += lerp(clanksMs, t);
      return {
        at: { x: lerp([button.x, lock.x], t), y: lerp([button.y, lock.y], t) },
        radius,
        pops,
        // meshed neighbours turn the other way, smaller ones faster
        turn: ((k % 2 === 0 ? 1 : -1) * (gap * BIG)) / radius,
      };
    });
    const meshedAt = gears[count - 1].pops;
    const burstsAt = meshedAt + whirlMs;
    // the train's angle so far, its speed climbing as it whirls
    const angleAt = (ms: number) => {
      const t = Math.max(0, ms);
      const ramp = clamp01((t - meshedAt) / whirlMs);
      return SPIN * (t + ((SPIN_UP - 1) * whirlMs * ramp * ramp) / 2);
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const clanking = createBeats(
      gears,
      (g) => g.pops,
      (g, k) => {
        cover!.burst(g.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CLANK_SHAKE, k / (count - 1)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.6);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: burstsAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          clanking.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= burstsAt) return;
          const spin = angleAt(ms);
          // the train glows hotter as it whirls up
          const heat = easeIn(clamp01((ms - meshedAt) / whirlMs));
          for (const g of gears) {
            if (ms < g.pops) continue;
            const r = g.radius * easeOutBack(clamp01((ms - g.pops) / POP_MS));
            const turn = spin * g.turn;
            const { x, y } = g.at;
            for (let i = 0; i < RIM; i++) {
              const a0 = turn + (i / RIM) * Math.PI * 2;
              const a1 = turn + ((i + 1) / RIM) * Math.PI * 2;
              a.x = x + Math.cos(a0) * r;
              a.y = y + Math.sin(a0) * r;
              b.x = x + Math.cos(a1) * r;
              b.y = y + Math.sin(a1) * r;
              drawBeam(ctx, a, b, BEAM, 0.9);
            }
            for (let i = 0; i < TEETH; i++) {
              const t = turn + (i / TEETH) * Math.PI * 2;
              a.x = x + Math.cos(t) * r;
              a.y = y + Math.sin(t) * r;
              b.x = x + Math.cos(t) * r * (1 + TOOTH);
              b.y = y + Math.sin(t) * r * (1 + TOOTH);
              drawBeam(ctx, a, b, BEAM * 1.4, 0.9);
            }
            for (let i = 0; i < SPOKES; i++) {
              const t = turn + (i / SPOKES) * Math.PI * 2;
              b.x = x + Math.cos(t) * r;
              b.y = y + Math.sin(t) * r;
              drawBeam(ctx, g.at, b, BEAM * 0.8, 0.7);
            }
          }
          if (heat > 0) drawBeamFlare(ctx, lock, 40 + 80 * heat, heat, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
