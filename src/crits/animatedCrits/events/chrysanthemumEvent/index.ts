// the "Chrysanthemum" event (money; free hires and cash): it covers its crit,
// whose click freezes the screen while a river of cash shoots straight up
// out of the clicked floor's button like a firework shell and bursts high
// over the screen with a bang and a big jolt into a chrysanthemum of cash:
// drooping streamers of cash arcing out every way, the longest curling down
// onto every empty spot on the floors in view, each landing with a splash, a
// bloop and a jolt as a new worker forms there; the last lands in a huge
// blast and shake and the coins sweep into the total. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "chrysanthemum";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const HIGH = 230;
// extra streamers that droop off into the air for the shape
const PETALS = 6;
const PETAL = 170;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceChrysanthemumEvent = registerWispEvent(
  KEY,
  "Chrysanthemum",
  () => CONFIG.chrysanthemumEvent.chance,
  (floor, context, area) => {
    const { riseMs, streamMs, droopMs, holdMs, mergeMs } =
      CONFIG.chrysanthemumEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const shell: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + HIGH,
    };
    const rise = sampleLine(
      (u) => ({
        x: lerp([button.x, shell.x], u),
        y: lerp([button.y, shell.y], u),
      }),
      30,
    );
    const risePour: Pour = {
      coinsAlong: 700,
      width: 36,
      streamMs: riseMs * 0.6,
      travelMs: riseMs,
    };
    const droop: Pour = {
      coinsAlong: 450,
      width: 18,
      streamMs,
      travelMs: droopMs,
    };
    const curve = (to: Point) => {
      // flung up and out first, then sagging down onto the spot
      const ctrl: Point = {
        x: shell.x + (to.x - shell.x) * 1.1,
        y: shell.y - 120,
      };
      return sampleLine((u) => bezier(shell, ctrl, to, u, { x: 0, y: 0 }), 30);
    };
    const strands = hires.map((hire) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      return { hire, spot, line: curve(spot) };
    });
    const petals = Array.from({ length: PETALS }, (_, i) => {
      const a = (i / PETALS) * Math.PI * 2 + 0.3;
      return curve({
        x: shell.x + Math.cos(a) * PETAL * 1.4,
        y: shell.y + Math.abs(Math.sin(a)) * PETAL + 60,
      });
    });
    const landsAt = riseMs + droopMs;
    const lands = strands.map((s, k) => ({ ...s, at: landsAt + k * 40 }));
    const last = lands[lands.length - 1];
    const durationMs = Math.max(
      pourDurationMs(riseMs, droop),
      last.at + holdMs + mergeMs,
    );

    const bursting = createBeats(
      [riseMs],
      (ms) => ms,
      () => {
        for (const s of strands) pourLine(cover!, s.line, droop);
        for (const p of petals) pourLine(cover!, p, droop);
        cover!.burst(shell, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.3);
      },
    );
    const landing = createBeats(
      lands,
      (l) => l.at,
      (l, k) => {
        giveHire(l.hire);
        if (l === last) {
          cover!.blast(l.spot);
          return;
        }
        cover!.burst(l.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, lands.length - 1)));
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
          bursting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, _ms, now) => drawRewardHires(ctx, hires, now, FORM_MS),
      },
    );
    if (!cover) return;
    pourLine(cover, rise, risePour);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
