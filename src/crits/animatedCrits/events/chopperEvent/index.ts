// the "Chopper" event (beam; free hires): it covers its crit, whose click
// freezes the screen while two long beams of light cross on a hub wisp on
// the clicked floor's button and start to turn like a rotor, faster and
// faster with a whoosh; the chopper lifts off and flies to every empty spot
// in view in turn, banking from one to the next, and hovers low over each,
// its blades whirling a blur of light, its downwash a flash and a jolt that
// sets down a new worker under it; over the last it drops down hard in a
// huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "chopper";
const MAX_HIRES = 5;
// a blade's reach (of the screen's width), its look, and its spin in turns
// a second, rising from the first to the second
const BLADE = 0.17;
const BLADE_W = 12;
const BLADE_ALPHA = 0.75;
const SPIN: [number, number] = [0.5, 6];
const HUB = WISP_SIZE * 0.8;
// px it hovers over a spot's head, and how far it bobs
const HOVER = 150;
const BOB = 10;
const FLARE = 40;
const LIFT_SHAKE = 0.6;
const DROP_SHAKE = 1.0;

export const forceChopperEvent = registerWispEvent(
  KEY,
  "Chopper",
  () => CONFIG.chopperEvent.chance,
  (floor, context, area) => {
    const { spinUpMs, flyMs, hoverMs, holdMs, mergeMs } = CONFIG.chopperEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blade = (area.right - area.left) * BLADE;
    // fly to each spot, nearest first, and hover over it
    const order: typeof hires = [];
    let from: Point = button;
    const left = [...hires];
    while (left.length > 0) {
      left.sort(
        (a, b) =>
          Math.hypot(a.x - from.x, a.y - from.y) -
          Math.hypot(b.x - from.x, b.y - from.y),
      );
      const next = left.shift()!;
      order.push(next);
      from = { x: next.x, y: next.y };
    }
    const stops = order.map((h) => ({ x: h.x, y: h.y - HOVER }));
    const spots = order.map((h) => ({ x: h.x, y: h.y - 40 }));
    const legs: { from: Point; to: Point; starts: number; ends: number }[] = [];
    let clock: number = spinUpMs;
    let at: Point = button;
    const drops: number[] = [];
    stops.forEach((to, k) => {
      const ms = lerp(flyMs, k / Math.max(1, stops.length - 1));
      legs.push({ from: at, to, starts: clock, ends: clock + ms });
      clock += ms;
      drops.push(clock + hoverMs * 0.5);
      legs.push({ from: to, to, starts: clock, ends: clock + hoverMs });
      clock += hoverMs;
      at = to;
    });
    const endAt = clock;
    const hub: Point = { x: 0, y: 0 };
    const hubAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t < spinUpMs) {
        hub.x = button.x;
        hub.y = button.y;
        return hub;
      }
      const leg = legs.find((l) => t < l.ends) ?? legs[legs.length - 1];
      const u = smoothstep(clamp01((t - leg.starts) / (leg.ends - leg.starts)));
      hub.x = lerp([leg.from.x, leg.to.x], u);
      hub.y = lerp([leg.from.y, leg.to.y], u) + Math.sin(t / 90) * BOB;
      return hub;
    };
    // the rotor's turn: its spin speeds up steadily over the whole flight
    const turnAt = (ms: number) => {
      const t = clamp01(ms / endAt);
      const [a, b] = SPIN;
      return Math.PI * 2 * (endAt / 1000) * (a * t + ((b - a) * t * t) / 2);
    };
    const tipA: Point = { x: 0, y: 0 };
    const tipB: Point = { x: 0, y: 0 };

    const spinning = createBeats(
      [0, spinUpMs],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms > 0) shakeScreen(LIFT_SHAKE);
      },
    );
    const dropping = createBeats(
      drops,
      (ms) => ms,
      (_, k) => {
        giveHire(order[k]);
        const spot = spots[k];
        if (k === drops.length - 1) {
          cover!.blast(spot);
          return;
        }
        cover!.burst(spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DROP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          spinning.tick(ms, now);
          dropping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, order, now);
          if (ms < 0 || ms > endAt + 300) return;
          const fade = 1 - clamp01((ms - endAt) / 300);
          const p = hubAt(ms);
          const reach = blade * easeOut(clamp01(ms / spinUpMs)) * fade;
          const turn = turnAt(ms);
          for (let k = 0; k < 2; k++) {
            const a = turn + (k * Math.PI) / 2;
            tipA.x = p.x + Math.cos(a) * reach;
            tipA.y = p.y + Math.sin(a) * reach * 0.35;
            tipB.x = p.x - Math.cos(a) * reach;
            tipB.y = p.y - Math.sin(a) * reach * 0.35;
            drawBeam(ctx, tipA, tipB, BLADE_W, BLADE_ALPHA * fade);
          }
          // the downwash while it hovers
          for (let k = 0; k < drops.length; k++) {
            const since = ms - (drops[k] - hoverMs * 0.5);
            if (since < 0 || since > hoverMs) continue;
            drawBeamFlare(
              ctx,
              spots[k],
              FLARE * Math.sin((Math.PI * since) / hoverMs),
              1,
              now,
            );
          }
          drawWisp(ctx, hubAt, ms, now, HUB * fade, 0.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
