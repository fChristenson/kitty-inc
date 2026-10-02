// the "Fire Hose" event: it covers its crit, whose click freezes the screen
// while the clicked floor's button turns into a fire hose at full blast: a
// thick jet of cash gushes out of it, whipping wildly side to side across the
// screen as the hose bucks and the screen rumbles, the gushing cash curling
// round and pouring on into the total (see ../moneyCover's flow)
import { CONFIG } from "../../config";
import { playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { FLOW_FLIGHT_MS } from "../moneyCover";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, lerp } from "../../shared/easing";

const KEY = "fireHose";
const REWARD = 4;
// coins along the jet while it's full
const COINS_ALONG = 1_900;
const END_PAUSE_MS = 100;
// the jet: whipping up to WHIP rad either side of straight up, WHIPS times
// over the spray, with a faster flutter on top; reaching REACH of the screen's
// height, drooping DROOP of it, JET px thick
const WHIP = 1.15;
const WHIPS = 2.2;
const FLUTTER = 0.22;
const FLUTTERS = 6.5;
const REACH = 0.55;
const DROOP = 0.12;
const JET = 70;
// the share of each coin's trip spent in the jet, before it curls on to the
// total, and its shrink along the way like a stream's
const JET_SHARE = 0.55;
const HEAD_SCALE = 0.45;
// the hose bucking the whole time
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 0.9];

export const forceFireHoseEvent = registerWispEvent(
  KEY,
  "Fire Hose",
  () => CONFIG.fireHoseEvent.chance,
  (floor, context, area) => {
    const { sprayMs, travelMs } = CONFIG.fireHoseEvent;
    const height = area.bottom - area.top;
    const durationMs =
      sprayMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
    const end = { x: (area.left + area.right) / 2, y: area.top + 90 };
    const side = Math.random() < 0.5 ? 1 : -1;
    const aimAt = (ms: number) => {
      const u = ms / sprayMs;
      return (
        -Math.PI / 2 +
        side * WHIP * Math.sin(Math.PI * 2 * WHIPS * u) +
        FLUTTER * Math.sin(Math.PI * 2 * FLUTTERS * u)
      );
    };

    let lastRumble = -Infinity;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs: 0 },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          if (ms > sprayMs || now - lastRumble < RUMBLE_MS || !cover?.isLive())
            return;
          lastRumble = now;
          shakeScreen(lerp(RUMBLE, clamp01(ms / sprayMs)));
        },
      },
    );
    if (!cover) return;
    const nozzle = cover.cover.button;
    const reach = height * REACH;
    const count = Math.round((COINS_ALONG * sprayMs) / travelMs);

    // coin i leaves the nozzle i/count of the way through the spray, at
    // that moment's aim, so the jet whips as they stream out one by one
    const paths: CoinPath[] = Array.from({ length: count }, (_, i) => {
      const angle = aimAt((sprayMs * i) / count);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const lane = between([-0.5, 0.5]) * JET;
      const tipX = nozzle.x + cos * reach - sin * lane;
      const tipY = nozzle.y + sin * reach + cos * lane + height * DROOP;
      const bendX = tipX + cos * reach * 0.3;
      const bendY = tipY + sin * reach * 0.3;
      return (f) => {
        const scale = 1 - (1 - HEAD_SCALE) * f;
        if (f < JET_SHARE) {
          // gushing out, slowing, drooping under its own weight
          const u = f / JET_SHARE;
          const out = 1 - (1 - u) ** 2;
          return {
            x: nozzle.x + cos * reach * out - sin * lane * u,
            y:
              nozzle.y +
              sin * reach * out +
              cos * lane * u +
              height * DROOP * u * u,
            scale,
          };
        }
        // curling round and on into the total
        const u = (f - JET_SHARE) / (1 - JET_SHARE);
        const v = 1 - u;
        return {
          x: v * v * tipX + 2 * u * v * bendX + u * u * end.x,
          y: v * v * tipY + 2 * u * v * bendY + u * u * end.y,
          scale,
        };
      };
    });
    cover.cover.flow(paths, sprayMs, travelMs);
    playBoostEventStream();
  },
);
