// the "Pulse Rifle" event (beam): it covers its crit, whose click freezes the
// screen while sparks race in to the clicked floor's button, charging it to a
// blazing glow as the screen rumbles; then it fires a burst of beam pulses up
// into the total-income readout, rat-a-tat, each a bolt of light dragging a
// slug of cash behind it and hitting the total with a flash and a jolt; the
// last pulse is the biggest and the total goes off in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { stampGlimmer } from "../../../../shared/twinkle";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "pulseRifle";
const REWARD = 4;
// the charge: SPARKS racing in from up to REACH of the screen's width away
const SPARKS = 40;
const REACH = 0.4;
const SPARK = 8;
const CHARGE_FLARE: [number, number] = [10, 40];
// PULSES pulses, each a bolt LENGTH of the way up, BOLT px across (the last
// BIG times that)
const PULSES = 5;
const LENGTH = 0.22;
const BOLT = 20;
const BIG = 2;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.2];
const HIT_SHAKE = 1.4;

export const forcePulseRifleEvent = registerWispEvent(
  KEY,
  "Pulse Rifle",
  () => CONFIG.pulseRifleEvent.chance,
  (floor, context, area) => {
    const { chargeMs, gapMs, boltMs, slugMs, holdMs, mergeMs } =
      CONFIG.pulseRifleEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const barrel = sampleLine(
      (u) => ({
        x: button.x + (fallback.x - button.x) * u,
        y: button.y + (fallback.y - button.y) * u,
      }),
      20,
    );
    const pour: Pour = {
      coinsAlong: 600,
      width: 34,
      streamMs: slugMs,
      travelMs: boltMs,
    };
    const pulses = Array.from(
      { length: PULSES },
      (_, k) => chargeMs + k * gapMs,
    );
    const hits = pulses.map((at) => at + boltMs);
    const lastHit = hits[PULSES - 1];
    const durationMs = Math.max(
      pourDurationMs(pulses[PULSES - 1], pour),
      lastHit + holdMs + mergeMs,
    );
    // sparks racing in to the button, each born somewhere in the charge
    const sparks = Array.from({ length: SPARKS }, () => {
      const a = Math.random() * Math.PI * 2;
      const d = width * REACH * (0.5 + 0.5 * Math.random());
      return {
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d,
        born: Math.random() * chargeMs * 0.85,
        life: 160 + Math.random() * 120,
      };
    });
    const head = { x: 0, y: 0 };
    const tail = { x: 0, y: 0 };

    let lastRumble = -Infinity;
    const firing = createBeats(
      pulses,
      (ms) => ms,
      () => pourLine(cover!, barrel, pour),
    );
    const hitting = createBeats(
      hits,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === PULSES - 1) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
          if (
            ms < chargeMs &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / chargeMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < chargeMs) {
            ctx.globalCompositeOperation = "lighter";
            for (const s of sparks) {
              const t = (ms - s.born) / s.life;
              if (t < 0 || t >= 1) continue;
              const k = 1 - t * t;
              stampGlimmer(
                ctx,
                button.x + s.dx * k,
                button.y + s.dy * k,
                SPARK * (0.4 + 0.6 * t),
                t * 3,
                COLOR.heavenlyGold,
              );
            }
            ctx.globalCompositeOperation = "source-over";
            drawBeamFlare(
              ctx,
              button,
              lerp(CHARGE_FLARE, clamp01(ms / chargeMs)),
              1,
              now,
            );
            return;
          }
          const total = cover?.total() ?? fallback;
          const dx = total.x - button.x;
          const dy = total.y - button.y;
          pulses.forEach((at, k) => {
            const u = (ms - at) / boltMs;
            if (u < 0 || u > 1 + LENGTH) return;
            const front = Math.min(1, u);
            const back = Math.max(0, u - LENGTH);
            head.x = button.x + dx * front;
            head.y = button.y + dy * front;
            tail.x = button.x + dx * back;
            tail.y = button.y + dy * back;
            const w = BOLT * (k === PULSES - 1 ? BIG : 1);
            drawBeam(ctx, tail, head, w);
            drawBeamFlare(ctx, head, w * 0.9, 1, now);
          });
          if (ms < lastHit)
            drawBeamFlare(ctx, button, CHARGE_FLARE[1] * 0.6, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
