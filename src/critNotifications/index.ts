import { getImageUrl, type ImageName } from "../loadAssets";
import { drawCritText } from "../shared/critText";
import {
  subscribeCritDisplayEvents,
  type CritDisplayEvent,
} from "../shared/critEvents";
import {
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
} from "../shared/critTypes";

const NOTIFICATION_LIFE_MS = 1800;
const FLOATING_X_RANGE_PX = 32;
const FLOATING_DELAY_MS = 300;
const FLOATING_WAVE_AMPLITUDE_PX = 30;
let overlay: HTMLDivElement | null = null;
let unsubscribeCritEvents: (() => void) | null = null;

function animateFloatingCrit(item: HTMLDivElement, delayMs: number): void {
  window.setTimeout(() => {
    item.style.visibility = "visible";
    const startedAt = performance.now();

    const frame = (now: number): void => {
      if (!item.isConnected) return;
      const progress = Math.min(1, (now - startedAt) / NOTIFICATION_LIFE_MS);
      const wave = progress * Math.PI * 2;
      const fadeIn = Math.min(1, progress / 0.12);
      const fadeOut = Math.min(1, (1 - progress) / 0.18);
      const opacity = Math.min(fadeIn, fadeOut);
      const popProgress = Math.min(1, progress / 0.2);
      const scale = 0.78 + Math.sin((popProgress * Math.PI) / 2) * 0.22;
      const x = Math.sin(wave) * FLOATING_WAVE_AMPLITUDE_PX;
      const y = 92 - progress * 224;
      const rotation = Math.cos(wave) * 7;

      item.style.opacity = `${opacity}`;
      item.style.filter = `saturate(${0.9 + opacity * 0.3}) brightness(${0.92 + opacity * 0.1})`;
      item.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        item.remove();
      }
    };

    window.requestAnimationFrame(frame);
  }, delayMs);
}

export function initCritNotifications(container: HTMLDivElement): void {
  overlay = container;
  unsubscribeCritEvents?.();
  unsubscribeCritEvents = subscribeCritDisplayEvents((event: CritDisplayEvent) => {
    notifyCrit(event.label, event.color, event.icon);
  });
}

export function notifyCrit(
  label: string,
  color: string,
  iconName?: ImageName,
): void {
  if (!overlay) return;
  const item = document.createElement("div");
  item.className = "crit-float";
  item.style.color = color;
  item.style.left = `${Math.random() * FLOATING_X_RANGE_PX}px`;
  item.style.visibility = "hidden";
  item.style.transform = "translate3d(0, 140px, 0) scale(0.78)";
  const delayMs = overlay.children.length * FLOATING_DELAY_MS;
  item.style.animationDelay = `${delayMs}ms`;
  if (iconName) {
    const image = document.createElement("img");
    image.src = getImageUrl(iconName);
    image.alt = "";
    item.append(image);
  } else {
    const tierClass =
      label === "x125"
        ? "crit-float--ultra"
        : label === "x25"
          ? "crit-float--mega"
          : "crit-float--crit";
    item.classList.add(tierClass);
    const textCanvas = document.createElement("canvas");
    const fontSize = label === "x125" ? 82 : label === "x25" ? 68 : 58;
    const strokeWidth = label === "x125" ? 16 : label === "x25" ? 14 : 8;
    textCanvas.width = 180;
    textCanvas.height = 110;
    textCanvas.className = "crit-float__text-canvas";
    const textContext = textCanvas.getContext("2d");
    if (textContext) {
      drawCritText(
        textContext,
        label,
        textCanvas.width / 2,
        textCanvas.height / 2,
        color,
        { fontSize, strokeWidth },
      );
    }
    item.append(textCanvas);
  }
  overlay.append(item);
  animateFloatingCrit(item, delayMs);
}

// dev/test-only: creates a deliberately dense mixed burst so the float
// animation can be inspected without waiting for random gameplay rolls
export function spawnRandomCritNotificationBurst(): void {
  const burstCount = 14;
  const firstTier =
    CRIT_TIER_ORDER[Math.floor(Math.random() * CRIT_TIER_ORDER.length)];
  notifyCrit(
    CRIT_TIER_CONFIG[firstTier].label,
    CRIT_TIER_CONFIG[firstTier].color,
  );
  for (let i = 0; i < burstCount; i++) {
    setTimeout(() => {
      if (Math.random() < 0.4) {
        const tier =
          CRIT_TIER_ORDER[Math.floor(Math.random() * CRIT_TIER_ORDER.length)];
        notifyCrit(CRIT_TIER_CONFIG[tier].label, CRIT_TIER_CONFIG[tier].color);
        return;
      }
      const kind =
        CRIT_PROC_KINDS[Math.floor(Math.random() * CRIT_PROC_KINDS.length)];
      const info = CRIT_PROC_INFO[kind];
      notifyCrit(info.label, CRIT_TIER_CONFIG.crit.color, info.icon);
    }, i * 95);
  }
}
