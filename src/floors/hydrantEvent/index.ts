// the "Hydrant" event (money; cash): it covers its crit, whose click freezes
// the screen while the clicked floor's button bursts like a fire hydrant:
// jets of cash blast out of it every way at once, each a thick river roaring
// to the screen's edge and smashing into it with a splash, a bloop and a
// jolt; a beat later a second, wider ring of jets bursts out between the
// first, harder, and the hydrant blows in a huge blast and shake as the
// coins sweep into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { fireBullet } from "../../shared/bullets";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "hydrant";
const REWARD = 4;
const JETS = 6;
const EDGE = 30;
const MIN_REACH = 80;
const HIT_SHAKE: [number, number] = [0.3, 1];

export const forceHydrantEvent = registerWispEvent(
  KEY,
  "Hydrant",
  () => CONFIG.hydrantEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, secondMs, holdMs, mergeMs } =
      CONFIG.hydrantEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const turn = Math.random() * Math.PI;
    const jets = [0, 1]
      .flatMap((wave) =>
        Array.from({ length: JETS }, (_, i) => {
          const angle = turn + ((i + wave / 2) / JETS) * Math.PI * 2;
          const to = fireBullet(button, angle, 0, 1, box).to;
          const reach = Math.hypot(to.x - button.x, to.y - button.y);
          const line = sampleLine(
            (u) => ({
              x: lerp([button.x, to.x], u),
              y: lerp([button.y, to.y], u),
            }),
            30,
          );
          const starts = wave * secondMs;
          // a jet's head reaches its edge in proportion to how far it is
          const jetMs = travelMs * (0.5 + 0.5 * (reach / 600));
          return { to, reach, line, starts, jetMs, hits: starts + jetMs, wave };
        }),
      )
      .filter((j) => j.reach > MIN_REACH);
    const pours = jets.map(
      (j): Pour => ({
        coinsAlong: j.wave === 0 ? 500 : 650,
        width: j.wave === 0 ? 30 : 40,
        streamMs,
        travelMs: j.jetMs,
      }),
    );
    const endAt = Math.max(...jets.map((j) => j.hits));
    const durationMs = Math.max(
      ...jets.map((j, k) => pourDurationMs(j.starts, pours[k])),
      endAt + holdMs + mergeMs,
    );

    const bursting = createBeats(
      [secondMs],
      (ms) => ms,
      () => {
        jets.forEach((j, k) => {
          if (j.wave === 1) pourLine(cover!, j.line, pours[k]);
        });
        cover!.burst(button, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const hitting = createBeats(
      jets,
      (j) => j.hits,
      (j, k) => {
        cover!.burst(j.to, 0.35);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(HIT_SHAKE, j.wave));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(button),
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
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    jets.forEach((j, k) => {
      if (j.wave === 0) pourLine(cover, j.line, pours[k]);
    });
    playBoostEventStream();
  },
);
