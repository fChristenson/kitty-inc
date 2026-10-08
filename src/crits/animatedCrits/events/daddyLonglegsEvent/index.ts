// the "Daddy Longlegs" event (beam; cash): it covers its crit, whose click
// freezes the screen while a wisp scuttles out of the clicked floor's button
// on eight long legs of blazing light, striding in a zigzag up the screen;
// every foot it plants stamps a flare and kicks up coins with a tick and a
// jolt, its legs scrabbling ever faster; at the top it rears up and bursts
// in a huge blast and shake as the coins sweep into the total. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "daddyLonglegs";
const REWARD = 4;
const LEGS = 8;
// feet rest REACH px out from the body, step once DRIFT px off their rest,
// landing LEAD ms ahead of it, at most MAX_UP in the air at once
const REACH = 110;
const DRIFT = 70;
const LEAD = 120;
const STEP_MS = 90;
const MAX_UP = 4;
const KNEE = 60;
const LEG = 8;
const SIM_MS = 16;
const EDGE = 90;
const TOP = 200;
const BODY = 0.6;
const FLARE = 20;
const FLARE_MS = 160;
const COINS = 2;
const COIN_REACH: [number, number] = [15, 60];
const STAMP_SHAKE = 0.25;
const STAMP_GAP_MS = 70;

interface Step {
  at: number;
  from: Point;
  to: Point;
}

export const forceDaddyLonglegsEvent = registerWispEvent(
  KEY,
  "Daddy Longlegs",
  () => CONFIG.daddyLonglegsEvent.chance,
  (floor, context, area) => {
    const { walkMs, holdMs, mergeMs } = CONFIG.daddyLonglegsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const route: Point[] = [
      button,
      { x: left, y: lerp([button.y, area.top + TOP], 0.25) },
      { x: right, y: lerp([button.y, area.top + TOP], 0.55) },
      { x: left, y: lerp([button.y, area.top + TOP], 0.8) },
      { x: (left + right) / 2, y: area.top + TOP },
    ];
    const bodyAt = (ms: number, into: Point): Point =>
      alongRoute(route, clamp01(ms / walkMs), into);
    const homes = Array.from({ length: LEGS }, (_, i) => {
      const a = ((i + 0.5) / LEGS) * Math.PI * 2;
      return { x: Math.cos(a) * REACH, y: Math.sin(a) * REACH * 0.7 };
    });
    // walked once at arm: every leg's steps
    const start = bodyAt(0, { x: 0, y: 0 });
    const steps: Step[][] = homes.map((h) => {
      const foot = { x: start.x + h.x, y: start.y + h.y };
      return [{ at: -STEP_MS, from: foot, to: foot }];
    });
    const plants: { at: number; to: Point }[] = [];
    const body = { x: 0, y: 0 };
    const ahead = { x: 0, y: 0 };
    for (let ms = 0; ms <= walkMs; ms += SIM_MS) {
      bodyAt(ms, body);
      bodyAt(ms + LEAD, ahead);
      let up = 0;
      for (const legSteps of steps)
        if (ms < legSteps[legSteps.length - 1].at + STEP_MS) up++;
      steps.forEach((legSteps, i) => {
        const lastStep = legSteps[legSteps.length - 1];
        if (ms < lastStep.at + STEP_MS || up >= MAX_UP) return;
        const rest = { x: body.x + homes[i].x, y: body.y + homes[i].y };
        if (Math.hypot(rest.x - lastStep.to.x, rest.y - lastStep.to.y) < DRIFT)
          return;
        const to = { x: ahead.x + homes[i].x, y: ahead.y + homes[i].y };
        legSteps.push({ at: ms, from: lastStep.to, to });
        plants.push({ at: ms + STEP_MS, to });
        up++;
      });
    }
    const endAt = walkMs;
    const end = bodyAt(walkMs, { x: 0, y: 0 });
    const bodyWisp: Point = { x: 0, y: 0 };
    const spider = (ms: number): Point => bodyAt(ms, bodyWisp);
    const foot: Point = { x: 0, y: 0 };
    const knee: Point = { x: 0, y: 0 };
    const hub: Point = { x: 0, y: 0 };
    let lastStamp = -Infinity;

    const stamping = createBeats(
      plants,
      (p) => p.at,
      (p, k) => {
        cover!.launchFrom(p.to, ringTargets(p.to, COINS, COIN_REACH));
        if (!cover!.isLive() || p.at - lastStamp < STAMP_GAP_MS) return;
        lastStamp = p.at;
        if (k % 3 === 0) playBloop();
        shakeScreen(STAMP_SHAKE);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(end),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          stamping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          bodyAt(ms, hub);
          for (const legSteps of steps) {
            let s = legSteps[0];
            for (const step of legSteps) if (step.at <= ms) s = step;
            const u = clamp01((ms - s.at) / STEP_MS);
            foot.x = lerp([s.from.x, s.to.x], u);
            foot.y = lerp([s.from.y, s.to.y], u) - Math.sin(Math.PI * u) * 30;
            knee.x = (hub.x + foot.x) / 2 + (foot.x - hub.x) * 0.2;
            knee.y = Math.min(hub.y, foot.y) - KNEE;
            drawBeam(ctx, hub, knee, LEG, 0.85);
            drawBeam(ctx, knee, foot, LEG, 0.85);
            const flare = (ms - s.at - STEP_MS) / FLARE_MS;
            if (flare >= 0 && flare < 1)
              drawBeamFlare(ctx, s.to, FLARE, 1 - flare, now);
          }
          drawWispBetween(
            ctx,
            spider,
            ms,
            now,
            WISP_SIZE * BODY,
            0.8,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
