// the "Billows" event (money; cash): it covers its crit, whose click
// freezes the screen while two broad currents of cash flood across the
// middle of the screen, the upper one streaming right and the lower one
// left; where they shear past each other the boundary ripples and rolls up
// into a row of great curling billows like breaking waves (a Kelvin-
// Helmholtz instability), each wound tighter and tighter, every half turn a
// whoosh and a jolt; then the billows peel off one after another and roll
// up into the total-income readout, the last in a huge blast. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";

const KEY = "billows";
const REWARD = 4;
const COINS = 1000;
// each current's depth, the billows' spacing, and how far a curl's spin
// reaches out from its eye (it fades with distance, so it winds a spiral)
const DEPTH = 210;
const WAVELENGTH = 330;
const REACH = 120;
// half turns the eyes wind, and how far (px) the currents drift either way
const HALF_TURNS = 5;
const DRIFT = 140;
const LAG = 120;
const ROLL_SHAKE: [number, number] = [0.3, 0.9];
const PEEL_SHAKE = 0.6;

export const forceBillowsEvent = registerWispEvent(
  KEY,
  "Billows",
  () => CONFIG.billowsEvent.chance,
  (floor, context, area) => {
    const { floodMs, rollMs, peelMs, riseMs, holdMs, mergeMs } =
      CONFIG.billowsEvent;
    const fallback = totalSpot(area);
    const mid = (area.top + area.bottom) / 2;
    const left = area.left - WAVELENGTH / 2;
    const right = area.right + WAVELENGTH / 2;
    const eyes = Math.ceil((right - left) / WAVELENGTH);
    const eyeX = (k: number) => left + (k + 0.5) * WAVELENGTH;
    const rollsAt = floodMs;
    const peelsAt = rollsAt + rollMs;
    // each billow peels off in turn, outer ones first, toward the middle
    const order = Array.from({ length: eyes }, (_, k) => k).sort(
      (a, b) =>
        Math.abs(eyeX(b) - (area.left + area.right) / 2) -
        Math.abs(eyeX(a) - (area.left + area.right) / 2),
    );
    const peelGap = eyes > 1 ? peelMs / (eyes - 1) : 0;
    const leaves = (k: number) => peelsAt + order.indexOf(k) * peelGap;
    // each coin rises up to LAG ms after its billow peels off
    const inAt = peelsAt + peelMs + LAG + riseMs;
    const travelMs = inAt;
    const total = () => cover?.total() ?? fallback;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x0 = lerp([left, right], Math.random());
      const upper = Math.random() < 0.5;
      const dy = (upper ? -1 : 1) * DEPTH * Math.sqrt(Math.random());
      const k = Math.min(
        eyes - 1,
        Math.max(0, Math.floor((x0 - left) / WAVELENGTH)),
      );
      const ex = eyeX(k);
      const rx = x0 - ex;
      const r = Math.hypot(rx, dy);
      const spin = Math.exp(-r / REACH);
      // each current floods in from its own side
      const enterX = upper
        ? area.left - 200 - Math.random() * 300
        : area.right + 200 + Math.random() * 300;
      const startsRise = leaves(k) + Math.random() * LAG;
      const end = { x: 0, y: 0 };
      const at = (ms: number, into: Point): Point => {
        if (ms < rollsAt) {
          const u = easeOut(clamp01(ms / floodMs));
          into.x = lerp([enterX, x0], u);
          into.y = mid + dy;
          return into;
        }
        const roll = easeIn(clamp01((ms - rollsAt) / rollMs));
        const a = HALF_TURNS * Math.PI * roll * spin;
        const drift = (upper ? 1 : -1) * DRIFT * roll * (1 - spin);
        into.x = ex + rx * Math.cos(a) - dy * Math.sin(a) + drift;
        into.y = mid + rx * Math.sin(a) + dy * Math.cos(a);
        return into;
      };
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < startsRise) return at(ms, { x: 0, y: 0 });
        at(startsRise, end);
        const t = total();
        const p = bezier(
          end,
          { x: end.x, y: t.y },
          t,
          easeIn(clamp01((ms - startsRise) / riseMs)),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: ms >= startsRise + riseMs ? 0 : 1 };
      };
    });
    const halfTurns = Array.from(
      { length: HALF_TURNS },
      (_, h) => rollsAt + rollMs * Math.sqrt((h + 1) / HALF_TURNS),
    );
    const peels = Array.from({ length: eyes }, (_, k) => leaves(k));

    const flooding = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const rolling = createBeats(
      halfTurns,
      (ms) => ms,
      (_, h) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(ROLL_SHAKE, h / Math.max(1, HALF_TURNS - 1)));
      },
    );
    const peeling = createBeats(
      peels,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(PEEL_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(total()),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flooding.tick(ms, now);
          rolling.tick(ms, now);
          peeling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
