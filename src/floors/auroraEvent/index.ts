// the "Aurora" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while a shimmering curtain of light unfurls out of the
// top of the screen, a row of rippling beams that folds and sways as it
// pours down over an income bar; as its hem reaches the bar it blazes in a
// flare, a bang and a big jolt and the bar jumps a crit tier; curtain after
// curtain ripples down onto the next bars, ever quicker, the last coming
// down in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { drawBeam } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars } from "../eventRewards";

const KEY = "aurora";
const MAX_BARS = 3;
const TOP = 120;
// RAYS beams across a curtain WIDE times the bar's width, swaying SWAY px
const RAYS = 9;
const WIDE = 1.2;
const SWAY = 26;
const WIDTH = 22;
const FADE_MS = 280;
const HIT_SHAKE: [number, number] = [0.9, 1.4];

export const forceAuroraEvent = registerWispEvent(
  KEY,
  "Aurora",
  () => CONFIG.auroraEvent.chance,
  (floor, context, area) => {
    const { curtainsMs, fallMs, holdMs, mergeMs } = CONFIG.auroraEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const top = area.top + TOP;
    let clock = 0;
    const curtains = bars.map((bar, k) => {
      const falls = clock;
      clock += lerp(curtainsMs, k / Math.max(1, bars.length - 1));
      const span = bar.box.width * WIDE;
      const rays = Array.from({ length: RAYS }, (_, i) => ({
        x: bar.center.x + span * (i / (RAYS - 1) - 0.5),
        phase: i * 0.7,
        top: { x: 0, y: top },
        hem: { x: 0, y: 0 },
      }));
      return { bar, falls, lands: falls + fallMs, rays };
    });
    const last = curtains[curtains.length - 1];
    const endAt = last.lands;

    const falling = createBeats(
      curtains,
      (c) => c.falls,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      curtains,
      (c) => c.lands,
      (c, k) => {
        cover!.tierUp(c.bar, { x: c.bar.center.x, y: top });
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, curtains.length - 1)));
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
          falling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms > endAt + FADE_MS) return;
          for (const c of curtains) {
            if (ms < c.falls) continue;
            const fade = 1 - clamp01((ms - c.lands) / FADE_MS);
            if (fade <= 0) continue;
            const drop = easeIn(clamp01((ms - c.falls) / (c.lands - c.falls)));
            const hemY = lerp([top, c.bar.center.y], drop);
            // brighter where it lands, the rays swaying like a curtain in wind
            const blaze = (0.45 + 0.55 * drop) * fade;
            for (const ray of c.rays) {
              const sway = Math.sin(ms / 110 + ray.phase) * SWAY;
              ray.top.x = ray.x + sway * 0.4;
              ray.hem.x = ray.x + sway * (1 - drop);
              ray.hem.y = hemY;
              drawBeam(ctx, ray.top, ray.hem, WIDTH, blaze);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
