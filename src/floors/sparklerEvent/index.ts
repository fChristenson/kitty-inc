// the "Sparkler" event (an experiment beyond the money/wisp templates): it
// covers its crit, whose click freezes the screen while the clicked floor's
// button lights up like a sparkler, a white-hot point spitting glitter sparks
// out every way that arc and fall and burn out; it fizzes wilder and wider as
// the screen rumbles, crackling with pops and jolts, then burns down in a
// huge blast and shake that sprays hundreds of coins over the screen, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { stampGlimmer } from "../../shared/twinkle";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeOutBack, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "sparkler";
const REWARD = 4;
// the sparks: SPARKS in all, thicker toward the end, each flung up to REACH
// of the screen's width (or height, if less) and sagging under GRAVITY
// (px/ms²) over LIFE ms, SPARK px across at its brightest
const SPARKS = 700;
const REACH = 0.42;
const GRAVITY = 0.0009;
const LIFE: [number, number] = [280, 520];
const SPARK = 9;
// the white-hot point, swelling over CORE of the screen's width
const CORE: [number, number] = [0.04, 0.09];
const POP_MS = 160;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 1.2];
// crackles: a burst, a bloop and a jolt, at these shares of the burn
const CRACKLES = [0.3, 0.5, 0.65, 0.78, 0.88, 0.95];
const CRACKLE_BURST = 0.5;
const CRACKLE_SHAKE = 1.2;
// the burn-out: coins sprayed SPRAY of the screen's width (or height) out
const SPRAY_COINS = 360;
const SPRAY: [number, number] = [0.1, 0.55];

export const forceSparklerEvent = registerWispEvent(
  KEY,
  "Sparkler",
  () => CONFIG.sparklerEvent.chance,
  (floor, context, area) => {
    const { burnMs, holdMs, mergeMs } = CONFIG.sparklerEvent;
    const width = area.right - area.left;
    const span = Math.min(width, area.bottom - area.top);
    const button = getButtonCenter(context.isGroundFloor);
    const sparks = Array.from({ length: SPARKS }, () => {
      const born = burnMs * Math.sqrt(Math.random());
      const life = between(LIFE);
      const angle = Math.random() * Math.PI * 2;
      // flung further as the sparkler burns hotter
      const reach =
        span * REACH * between([0.3, 1]) * (0.4 + 0.6 * (born / burnMs));
      return {
        born,
        life,
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach,
        spin: Math.random() * Math.PI,
      };
    }).sort((a, b) => a.born - b.born);
    const coreAt = (ms: number): Point | null =>
      ms < 0 || ms >= burnMs ? null : button;

    let lastRumble = -Infinity;
    const crackling = createBeats(
      CRACKLES,
      (u) => u * burnMs,
      () => {
        const r = span * 0.15;
        cover!.burst(
          {
            x: button.x + (Math.random() - 0.5) * r,
            y: button.y + (Math.random() - 0.5) * r,
          },
          CRACKLE_BURST,
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CRACKLE_SHAKE);
      },
    );
    const burnOut = createBeats(
      [burnMs],
      (ms) => ms,
      () => {
        cover!.blast(button);
        cover!.launchFrom(
          button,
          clampTargetsY(
            sprayTargets(button, SPRAY_COINS, [
              span * SPRAY[0],
              span * SPRAY[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: burnMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          crackling.tick(ms, now);
          burnOut.tick(ms, now);
          if (ms < burnMs && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / burnMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > burnMs + LIFE[1]) return;
          const heat = clamp01(ms / burnMs);
          ctx.globalCompositeOperation = "lighter";
          for (const s of sparks) {
            if (s.born > ms) break;
            const t = ms - s.born;
            if (t >= s.life) continue;
            const u = t / s.life;
            // slowing as it flies, sagging as it falls
            const out = u * (2 - u);
            stampGlimmer(
              ctx,
              button.x + s.dx * out,
              button.y + s.dy * out + 0.5 * GRAVITY * t * t,
              SPARK * (1 - u),
              s.spin,
              COLOR.heavenlyGold,
            );
          }
          ctx.globalCompositeOperation = "source-over";
          const size =
            Math.max(WISP_SIZE, width * lerp(CORE, heat)) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, coreAt, ms, now, size, heat, 0, burnMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
