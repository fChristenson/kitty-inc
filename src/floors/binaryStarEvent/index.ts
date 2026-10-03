// the "Binary Star" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while two wisps fly out of the clicked floor's button to
// the middle of the screen and fall into orbit round each other like a
// binary star, spiralling in tighter and faster, every pass a flash and a
// jolt as the screen hums; they collide in a blinding flash and a bang, and
// jets of light shoot out of the merger into the income bars, each a crack
// and a big jolt as the bar jumps a crit tier; the last lands in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars } from "../eventRewards";

const KEY = "binaryStar";
const MAX_BARS = 3;
// the pair swings in from RADIUS px apart over TURNS turns, the spin
// quickening as they close
const RADIUS = 150;
const TURNS = 4;
const FLY_MS = 250;
const STAR = 0.6;
const JET = 0.45;
const JET_GAP_MS = 110;
const PASS_SHAKE: [number, number] = [0.15, 0.8];
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBinaryStarEvent = registerWispEvent(
  KEY,
  "Binary Star",
  () => CONFIG.binaryStarEvent.chance,
  (floor, context, area) => {
    const { spiralMs, jetMs, holdMs, mergeMs } = CONFIG.binaryStarEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 - 60,
    };
    const mergeAt = FLY_MS + spiralMs;
    // the turn and separation u 0..1 through the spiral
    const turnOf = (u: number) => TURNS * Math.PI * 2 * (1 - (1 - u) ** 0.6);
    const radiusOf = (u: number) => RADIUS * (1 - u) ** 0.66;
    const stars = [0, Math.PI].map((phase) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms >= mergeAt) return null;
        if (ms < FLY_MS) {
          const u = easeOut(ms / FLY_MS);
          at.x = lerp([button.x, center.x + Math.cos(phase) * RADIUS], u);
          at.y = lerp([button.y, center.y + Math.sin(phase) * RADIUS], u);
          return at;
        }
        const u = (ms - FLY_MS) / spiralMs;
        const a = phase + turnOf(u);
        const r = radiusOf(u);
        at.x = center.x + Math.cos(a) * r;
        at.y = center.y + Math.sin(a) * r * 0.8;
        return at;
      };
    });
    // every half turn: the moment the pair lines up across
    const passes: number[] = [];
    for (let k = 1; k < TURNS * 2; k++)
      passes.push(FLY_MS + spiralMs * (1 - (1 - k / (TURNS * 2)) ** (1 / 0.6)));
    const jets = bars.map((bar, k) => {
      const leaves = mergeAt + k * JET_GAP_MS;
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        leaves,
        lands: leaves + jetMs,
        at: (ms: number): Point => {
          const u = easeIn(clamp01((ms - leaves) / jetMs));
          at.x = lerp([center.x, bar.center.x], u);
          at.y = lerp([center.y, bar.center.y], u);
          return at;
        },
      };
    });
    const last = jets[jets.length - 1];
    const endAt = last.lands;

    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        cover!.burst(center, 0.15 + 0.03 * k);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, k / (passes.length - 1)));
      },
    );
    const merging = createBeats(
      [mergeAt],
      (ms) => ms,
      () => {
        cover!.burst(center, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.6);
      },
    );
    const landing = createBeats(
      jets,
      (j) => j.lands,
      (j, k) => {
        cover!.tierUp(j.bar, center);
        if (j === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(j.bar.center);
          return;
        }
        cover!.burst(j.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jets.length - 1)));
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
          passing.tick(ms, now);
          merging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const heat = clamp01(ms / mergeAt);
          for (const star of stars)
            drawWispBetween(
              ctx,
              star,
              ms,
              now,
              WISP_SIZE * STAR,
              heat,
              0,
              mergeAt,
            );
          for (const j of jets)
            drawWispBetween(
              ctx,
              j.at,
              ms,
              now,
              WISP_SIZE * JET,
              1,
              j.leaves,
              j.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
