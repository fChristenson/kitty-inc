// the "Tractor Beam" event (beam): it covers its crit, whose click freezes the
// screen while a beam reaches down out of the total-income readout onto the
// clicked floor's button, flickering, then blazes open wide with a jolt, and
// a huge column of cash spirals up it out of the button into the total, the
// screen rumbling; then the beam slams shut in a huge blast and shake and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";

const KEY = "tractorBeam";
const REWARD = 4;
// the beam opens to WIDE of the screen's width, narrowing to NARROW of that
// at the total
const WIDE = 0.34;
const NARROW = 0.3;
const SHUT_MS = 160;
// the column: COINS spiralling up SPIN turns as each rises, scaled by
// depth from DEEP (behind) to 1 (in front)
const COINS = 1_300;
const SPIN = 2.5;
const DEEP = 0.5;
const COIN = 0.85;
const FLARE = 40;
const OPEN_SHAKE = 2;
const RUMBLE_MS = 70;
const RUMBLE = 1;

export const forceTractorBeamEvent = registerWispEvent(
  KEY,
  "Tractor Beam",
  () => CONFIG.tractorBeamEvent.chance,
  (floor, context, area) => {
    const { aimMs, openMs, liftMs, riseMs, holdMs, mergeMs } =
      CONFIG.tractorBeamEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const wide = width * WIDE;
    const liftFrom = aimMs + openMs * 0.5;
    const shutAt = liftFrom + liftMs + riseMs;
    // the beam's width ms in, wide at the button and narrower up top
    const beamWidth = (ms: number) => {
      if (ms < aimMs) return 0;
      if (ms >= shutAt) return wide * (1 - clamp01((ms - shutAt) / SHUT_MS));
      return wide * easeOutBack(clamp01((ms - aimMs) / openMs));
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const lift = liftFrom + Math.random() * liftMs;
      const turn0 = Math.random() * Math.PI * 2;
      const r = 0.15 + 0.85 * Math.sqrt(Math.random());
      return (f) => {
        const ms = f * shutAt;
        if (ms < lift) return { x: button.x, y: button.y, scale: 0 };
        const total = cover?.total() ?? fallback;
        const u = clamp01((ms - lift) / riseMs);
        const up = easeIn(u);
        const half = (beamWidth(ms) / 2) * (1 - (1 - NARROW) * up) * r;
        const a = turn0 + Math.PI * 2 * SPIN * u;
        const cx = button.x + (total.x - button.x) * up;
        return {
          x: cx + Math.sin(a) * half,
          y: button.y + (total.y - button.y) * up,
          scale:
            COIN *
            (DEEP + (1 - DEEP) * (0.5 + 0.5 * Math.cos(a))) *
            (1 - 0.5 * up),
        };
      };
    });

    let lastRumble = -Infinity;
    const open = createBeats(
      [aimMs],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(OPEN_SHAKE);
      },
    );
    const shut = createBeats(
      [shutAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: shutAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          open.tick(ms, now);
          shut.tick(ms, now);
          if (
            ms > aimMs &&
            ms < shutAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(RUMBLE);
          }
        },
        drawOver: (ctx, ms) => {
          if (ms >= shutAt + SHUT_MS) return;
          const total = cover?.total() ?? fallback;
          if (ms < aimMs) {
            drawAimLaser(ctx, total, button);
            return;
          }
          const w = beamWidth(ms);
          // a wide soft column with a narrower blazing one inside it
          drawBeam(ctx, total, button, w, 0.45);
          drawBeam(ctx, total, button, w * 0.45, 0.8);
          drawBeamFlare(ctx, button, FLARE * (w / wide));
          drawBeamFlare(ctx, total, FLARE * 0.7 * (w / wide));
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, shutAt);
    playBoostEventStream();
  },
);
