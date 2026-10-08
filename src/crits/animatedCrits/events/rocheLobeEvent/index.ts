// the "Roche Lobe" event (galaxy; cash): it covers its crit, whose click
// freezes the screen while a big puffy star of glitter swirls up on one side
// of the screen and a small hot wisp circles it; the wisp's gravity peels a
// stream of glitter off the big star's side, which arcs across and wraps
// round the small one into a whirling disk, swelling and blazing hotter, its
// pops coming faster; then the disk blows in a nova, a blinding flash and a
// shake that sprays its glitter out as a burst of coins, and the coins pour
// into the total in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { ringTargets } from "../../../../shared/coinTargets";
import { planDisk, scatterDisk, type Orbit } from "../../../../shared/galaxy";
import { totalSpot } from "../../cashFlow";

const KEY = "rocheLobe";
const REWARD = 4;
const STARS = 260;
const STAR = 9;
// the big star, its glitter envelope, and the small one circling it
const BIG = WISP_SIZE * 1.6;
const ENVELOPE = 120;
const SMALL = WISP_SIZE * 0.7;
const GAP = 280;
const LAPS = 0.35;
const DISK = 70;
const DISK_IN = 14;
// each grain's arc across, bowing this far
const BOW = 90;
const SLIDE_MS = 200;
const POP_EVERY = 25;
const NOVA_COINS = 40;
const NOVA_RING: [number, number] = [80, 260];
const POP_SHAKE = 0.25;
const NOVA_SHAKE = 1.4;
const SOUND_GAP_MS = 60;

interface Grain {
  orbit: Orbit;
  leaves: number;
  arrives: number;
  ring: Orbit;
}

export const forceRocheLobeEvent = registerWispEvent(
  KEY,
  "Roche Lobe",
  () => CONFIG.rocheLobeEvent.chance,
  (floor, context, area) => {
    const { growMs, feedMs, flowMs, liftMs, holdMs, mergeMs } =
      CONFIG.rocheLobeEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const big: Point = {
      x: lerp([area.left, area.right], 0.3),
      y: lerp([area.top, area.bottom], 0.42),
    };
    const envelope = planDisk(big, {
      inner: 10,
      outer: ENVELOPE,
      squash: 0.9,
      rimHz: 0.25,
    });
    const small: Point = { x: 0, y: 0 };
    const smallAt = (ms: number, into: Point): Point => {
      const a = -0.3 + LAPS * Math.PI * 2 * (ms / (growMs + feedMs + flowMs));
      into.x = big.x + Math.cos(a) * GAP;
      into.y = big.y + Math.sin(a) * GAP * 0.6;
      return into;
    };
    smallAt(0, small);
    const disk = planDisk(small, {
      inner: DISK_IN,
      outer: DISK,
      squash: 0.45,
      tilt: 0.3,
      rimHz: 1.4,
    });
    const novaAt = growMs + feedMs + flowMs;
    const inAt = novaAt + liftMs;
    // grains peeled off in turn, each arcing over onto its own disk orbit
    const grains: Grain[] = scatterDisk(envelope, STARS).map((orbit, i) => {
      const leaves = growMs + feedMs * (i / STARS) ** 0.8;
      return {
        orbit,
        leaves,
        arrives: leaves + flowMs,
        ring: {
          radius: lerp([DISK, DISK_IN], Math.random() ** 0.7),
          phase: Math.random() * 7,
        },
      };
    });
    let soundAt = -Infinity;

    const peeling = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const popping = createBeats(
      grains.filter((_, i) => i % POP_EVERY === POP_EVERY - 1),
      (g) => g.arrives,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(POP_SHAKE);
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playBloop();
      },
    );
    const nova = createBeats(
      [novaAt, inAt],
      (ms) => ms,
      (ms) => {
        if (ms >= inAt) {
          cover!.blast(total());
          return;
        }
        const at = smallAt(novaAt, { x: 0, y: 0 });
        cover!.burst(at, 1.5);
        cover!.launchFrom(at, ringTargets(at, NOVA_COINS, NOVA_RING));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(NOVA_SHAKE);
      },
    );

    const grain: Point = { x: 0, y: 0 };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };
    const bow: Point = { x: 0, y: 0 };
    const toward: Point = { x: 0, y: 0 };
    // the point on the big star's rim facing the small one at ms
    const lobePoint = (ms: number, into: Point): Point => {
      smallAt(ms, toward);
      const dx = toward.x - big.x;
      const dy = toward.y - big.y;
      const d = Math.hypot(dx, dy) || 1;
      into.x = big.x + (dx / d) * ENVELOPE;
      into.y = big.y + (dy / d) * ENVELOPE * 0.9;
      return into;
    };
    const bigAt = () => big;
    const smallSpot = (ms: number) => smallAt(ms, small);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          peeling.tick(ms, now);
          popping.tick(ms, now);
          nova.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > novaAt + 300) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fed = clamp01((ms - growMs) / feedMs);
          const flash = 1 - clamp01((ms - novaAt) / 300);
          smallAt(ms, small);
          drawWisp(
            ctx,
            bigAt,
            ms,
            now,
            BIG * grow * (1 - 0.4 * fed) * flash,
            0.4,
          );
          if (ms < novaAt) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < grains.length; i++) {
              const g = grains[i];
              if (ms < g.leaves - SLIDE_MS)
                envelope.at(g.orbit, ms, grain, grow);
              else if (ms < g.arrives) {
                // drawn to the big star's side facing the small one, then over
                lobePoint(g.leaves, from);
                if (ms < g.leaves) {
                  envelope.at(g.orbit, ms, grain, grow);
                  const u = easeIn((ms - (g.leaves - SLIDE_MS)) / SLIDE_MS);
                  grain.x = lerp([grain.x, from.x], u);
                  grain.y = lerp([grain.y, from.y], u);
                } else {
                  disk.at(g.ring, ms, to);
                  bow.x = (from.x + to.x) / 2 + (to.y - from.y) * 0.3;
                  bow.y = (from.y + to.y) / 2 - BOW;
                  bezier(
                    from,
                    bow,
                    to,
                    easeIn((ms - g.leaves) / flowMs),
                    grain,
                  );
                }
              } else disk.at(g.ring, ms, grain);
              stampGlimmer(
                ctx,
                grain.x,
                grain.y,
                STAR * (ms >= g.arrives ? 1.2 : 1),
                i + ms * 0.005,
                ms >= g.arrives || i % 2 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
            ctx.restore();
          }
          drawWisp(
            ctx,
            smallSpot,
            ms,
            now,
            SMALL * grow * (1 + fed) * (ms >= novaAt ? 1.5 * flash : 1),
            0.4 + 0.6 * fed,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
