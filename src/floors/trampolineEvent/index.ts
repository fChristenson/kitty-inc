// the "Trampoline" event: it covers its crit, whose click freezes the screen
// while a wisp drops out of its top and hits its bottom as if on a
// trampoline, bouncing back up higher every time, each landing a squash, a
// slam, a jolt and coins kicked up off it, harder and harder; the last bounce
// launches it right up into the total-income readout in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "trampoline";
const REWARD = 4;
// the bed GROUND of the screen's height up from its bottom; each bounce
// rises to these shares of the way up from it to the total
const GROUND = 0.08;
const BOUNCES = [0.3, 0.5, 0.7];
// the wisp, as a share of the screen's width, squashed SQUASH on each landing
const WISP = 0.07;
const SQUASH_MS = 120;
const SQUASH = 0.45;
const LAND_COINS = [10, 16, 22, 28];
const LAND_REACH: [number, number] = [40, 130];
const LAND_SHAKE: [number, number] = [1.2, 2.4];
const LAND_BURST: [number, number] = [0.6, 1.2];

export const forceTrampolineEvent = registerWispEvent(
  KEY,
  "Trampoline",
  () => CONFIG.trampolineEvent.chance,
  (floor, context, area) => {
    const { dropMs, holdMs, mergeMs } = CONFIG.trampolineEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const ground = area.bottom - height * GROUND;
    const climb = ground - fallback.y;
    const startX = area.left + width * (Math.random() < 0.5 ? 0.25 : 0.75);
    const top = area.top - 30;
    // gravity so the first drop takes dropMs; each bounce then takes the
    // time a real one would
    const g = (2 * (ground - top)) / (dropMs * dropMs);
    const hops = BOUNCES.map((share) => climb * share);
    const landings: number[] = [dropMs];
    for (const h of hops)
      landings.push(landings[landings.length - 1] + 2 * Math.sqrt((2 * h) / g));
    const launchAt = landings[landings.length - 1];
    const inAt = launchAt + Math.sqrt((2 * climb) / g);
    // drifting across toward the total, a step per bounce
    const xAt = (ms: number) =>
      startX + (fallback.x - startX) * clamp01(ms / inAt);
    const into = { x: 0, y: 0 };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= inAt) return null;
      into.x = xAt(ms);
      if (ms < dropMs) {
        into.y = top + 0.5 * g * ms * ms;
        return into;
      }
      const k = landings.findIndex((at) => at > ms) - 1;
      const t = ms - landings[k >= 0 ? k : landings.length - 1];
      if (ms >= launchAt) {
        // the last bounce, slowing to a stop on the total
        const total = cover?.total() ?? fallback;
        const up = Math.sqrt(2 * g * (ground - total.y));
        into.y = ground - up * t + 0.5 * g * t * t;
        return into;
      }
      const up = Math.sqrt(2 * g * hops[k]);
      into.y = ground - up * t + 0.5 * g * t * t;
      return into;
    };

    const slams = createBeats(
      landings,
      (ms) => ms,
      (ms, k) => {
        const t = k / (landings.length - 1);
        const at = { x: xAt(ms), y: ground };
        cover!.burst(at, lerp(LAND_BURST, t));
        cover!.launchFrom(
          at,
          sprayTargets(
            at,
            LAND_COINS[k],
            LAND_REACH,
            -Math.PI / 2,
            Math.PI * 0.8,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          slams.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const latest = slams.latest();
          const squash = latest ? clamp01((now - latest.at) / SQUASH_MS) : 1;
          const size =
            Math.max(WISP_SIZE, width * WISP) * (1 - SQUASH * (1 - squash));
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            size,
            clamp01(ms / inAt),
            0,
            inAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
