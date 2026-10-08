// the "Gumball Machine" event (an experiment beyond the seven looks: a
// gumball machine; free hires): it covers its crit, whose click freezes the
// screen while a heap of gumball wisps tumbles out of the clicked floor's
// button into a churning globe at the top of the screen; with a crank and a
// rattle the globe swirls and drops a gumball out of its bottom, which
// bounces down the screen onto an empty spot on a floor in view, popping
// with a flash and a jolt as a new worker forms there; crank after crank,
// ever faster, the last gumball landing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "gumballMachine";
const MAX_HIRES = 6;
const SPARE = 4;
const FORM_MS = 300;
const LIFT = 30;
const TOP = 230;
const GLOBE = 75;
// each gumball bounces BOUNCES times on its way down, the hops shrinking
const BOUNCES = 3;
const HOP = 80;
const GUMBALL = 0.32;
const CRANK_SHAKE = 0.4;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceGumballMachineEvent = registerWispEvent(
  KEY,
  "Gumball Machine",
  () => CONFIG.gumballMachineEvent.chance,
  (floor, context, area) => {
    const { fillMs, cranksMs, rollMs, holdMs, mergeMs } =
      CONFIG.gumballMachineEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const globe: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const chute: Point = { x: globe.x, y: globe.y + GLOBE + 20 };
    let clock: number = fillMs;
    const drops = hires.map((hire, k) => {
      const at = clock;
      clock += lerp(cranksMs, k / Math.max(1, hires.length - 1));
      return {
        hire,
        at,
        lands: at + rollMs,
        spot: { x: hire.x, y: hire.y - LIFT } as Point,
      };
    });
    const last = drops[drops.length - 1];
    const endAt = last.lands;
    // every gumball churns in the globe until its drop; the spares never drop
    const balls = Array.from({ length: hires.length + SPARE }, (_, i) => {
      const drop = drops[i] ?? null;
      const phase = (i / (hires.length + SPARE)) * Math.PI * 2;
      const r = GLOBE * (0.35 + (0.55 * ((i * 7) % 5)) / 4);
      const lands = (fillMs * 0.6 * i) / (hires.length + SPARE) + fillMs * 0.4;
      const at: Point = { x: 0, y: 0 };
      const home = (ms: number, into: Point): Point => {
        const churn = phase + (ms / 300) * (1 + ms / 2_000);
        into.x = globe.x + Math.cos(churn) * r;
        into.y = globe.y + Math.sin(churn) * r * 0.8;
        return into;
      };
      return {
        drop,
        lands,
        at: (ms: number): Point => {
          if (ms < lands) {
            home(ms, at);
            const u = easeOut(clamp01(ms / lands));
            at.x = lerp([button.x, at.x], u);
            at.y = lerp([button.y, at.y], u);
            return at;
          }
          if (!drop || ms < drop.at) return home(ms, at);
          const u = clamp01((ms - drop.at) / rollMs);
          // down through the chute, then bouncing out to its spot
          const hop = Math.abs(Math.sin(u * BOUNCES * Math.PI)) * HOP * (1 - u);
          at.x = lerp([chute.x, drop.spot.x], u);
          at.y = lerp([chute.y, drop.spot.y], u * u) - hop;
          return at;
        },
      };
    });

    const cranking = createBeats(
      drops,
      (d) => d.at,
      () => {
        cover!.burst(chute, 0.25);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(CRANK_SHAKE);
      },
    );
    const landing = createBeats(
      drops,
      (d) => d.lands,
      (d, k) => {
        giveHire(d.hire);
        if (d === last) {
          cover!.blast(d.spot);
          return;
        }
        cover!.burst(d.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, drops.length - 1)));
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
          cranking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const b of balls)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * GUMBALL,
              0.5,
              0,
              b.drop ? b.drop.lands : endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
