// the "Quasar" event (galaxy; a crit tier): it covers its crit, whose click
// freezes the screen while a three-armed galaxy of glitter swirls up high
// over the clicked floor's bar, seen almost edge on, round a black-hole core
// wisp; its stars spiral down into the core ever faster, every few swallowed
// a pop, the core swelling and blazing hotter; then it ignites: twin jets of
// light blast out of its poles, one up off the screen and one straight down
// onto the bar, which jumps a crit tier in a huge blast. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { planDisk, scatterArms, type Orbit } from "../../../../shared/galaxy";
import { findRewardBars } from "../../eventRewards";

const KEY = "quasar";
const STARS = 280;
const STAR = 9;
// the galaxy this high over the bar, a share of the screen's width across
// (at most OUTER), nearly edge on
const ABOVE = 300;
const DISK = 0.42;
const OUTER = 320;
const INNER = 30;
const SQUASH = 0.28;
// stars fall into the core over this share range of the feeding
const INFALL: [number, number] = [0.15, 1];
const FALL_MS = 450;
const DRAIN: Orbit = { radius: 4, phase: 0 };
const CORE: [number, number] = [WISP_SIZE * 0.6, WISP_SIZE * 1.6];
// the jets: how long they reach out, how wide they blaze
const JET_W: [number, number] = [14, 46];
const JET_UP = 1400;
const FLARE = 70;
const POP_EVERY = 14;
const POP_SHAKE = 0.15;
const IGNITE_SHAKE = 1.2;
const SOUND_GAP_MS = 70;

export const forceQuasarEvent = registerWispEvent(
  KEY,
  "Quasar",
  () => CONFIG.quasarEvent.chance,
  (floor, context, area) => {
    const { growMs, feedMs, jetMs, blazeMs, holdMs, mergeMs } =
      CONFIG.quasarEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const core: Point = {
      x: bar.center.x,
      y: Math.max(area.top + 120, bar.center.y - ABOVE),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(core, {
      inner: INNER,
      outer,
      squash: SQUASH,
      rimHz: 0.8,
    });
    const stars = scatterArms(disk, STARS, 3, 0.8, 0.3);
    const igniteAt = growMs + feedMs;
    const hitAt = igniteAt + jetMs;
    const endMs = hitAt + blazeMs;
    // the inner stars go first, like a real disk draining inward
    const falls = stars
      .map((o) => ({
        orbit: o,
        swallowed:
          growMs +
          feedMs *
            lerp(
              INFALL,
              clamp01((o.radius - INNER) / (outer - INNER)) * 0.7 +
                Math.random() * 0.3,
            ),
      }))
      .sort((a, b) => a.swallowed - b.swallowed);
    let soundAt = -Infinity;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const swallowing = createBeats(
      falls.filter((_, i) => i % POP_EVERY === POP_EVERY - 1),
      (f) => f.swallowed,
      (_, __, now) => {
        if (!cover!.isLive() || now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        shakeScreen(POP_SHAKE);
        playBloop();
      },
    );
    const igniting = createBeats(
      [igniteAt, hitAt],
      (ms) => ms,
      (ms) => {
        if (ms >= hitAt) {
          cover!.tierUp(bar, core);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(core, 1.2);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(IGNITE_SHAKE);
      },
    );

    const star: Point = { x: 0, y: 0 };
    const top: Point = { x: core.x, y: core.y };
    const bottom: Point = { x: core.x, y: core.y };
    const coreAt = () => core;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          swallowing.tick(ms, now);
          igniting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fed = clamp01((ms - growMs) / feedMs);
          // the jets, under the core
          if (ms >= igniteAt) {
            const reach = easeOut(clamp01((ms - igniteAt) / jetMs));
            const fade = 1 - clamp01((ms - hitAt) / blazeMs);
            const width =
              lerp(JET_W, reach) * (0.85 + 0.15 * Math.sin(now / 30));
            top.y = core.y - JET_UP * reach;
            bottom.y = lerp([core.y, bar.center.y], reach);
            drawBeam(ctx, core, top, width, fade);
            drawBeam(ctx, core, bottom, width, fade);
            if (ms >= hitAt) drawBeamFlare(ctx, bottom, FLARE, fade, now);
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < falls.length; i++) {
            const f = falls[i];
            if (ms >= f.swallowed) continue;
            const u = easeIn(clamp01((ms - (f.swallowed - FALL_MS)) / FALL_MS));
            disk.drift(f.orbit, DRAIN, u, ms, star, grow);
            stampGlimmer(
              ctx,
              star.x,
              star.y,
              STAR * (1 - 0.5 * u),
              i + ms * 0.006,
              i % 2 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
          const size = lerp(CORE, fed) * grow * (ms >= igniteAt ? 1.3 : 1);
          drawWisp(ctx, coreAt, ms, now, size, 0.3 + 0.7 * fed);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
