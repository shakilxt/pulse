import { useId } from "react";
import { cn } from "@/lib/cn";

/** Ground line of the right-hand shore: rises out of the sea, then levels off. */
function shoreY(x: number): number {
  const t = Math.min(Math.max((x - 980) / 140, 0), 1);
  return 352 - 26 * (1 - (1 - t) * (1 - t));
}

/** Deterministic tree heights so server and client markup always match. */
const FOREST_PATH = (() => {
  let d = `M960 360 L960 ${shoreY(960)}`;
  for (let x = 980; x <= 1440; x += 14) {
    const base = shoreY(x);
    const growth = Math.min((x - 980) / 160, 1);
    const height = Math.round((14 + Math.abs(Math.sin(x * 0.11)) * 26 + ((x - 980) / 460) * 18) * (0.35 + 0.65 * growth));
    d += ` L${x} ${base} L${x + 7} ${base - height} L${x + 14} ${base}`;
  }
  return `${d} L1454 360 Z`;
})();

interface LandscapeProps {
  className?: string;
  /** Strength of the ivory wash fading the bottom edge into the page. */
  fade?: "soft" | "strong";
}

/**
 * Misty mountain coastline. Purely decorative; colours come from --land-* tokens
 * so it adapts to light and dark themes.
 */
export function Landscape({ className, fade = "soft" }: LandscapeProps) {
  const id = useId();
  const mistId = `${id}-mist`;
  const fadeId = `${id}-fade`;
  const sunId = `${id}-sun`;
  const skyId = `${id}-sky`;

  return (
    <svg
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <linearGradient id={mistId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--land-mist)" stopOpacity="0" />
          <stop offset="0.55" stopColor="var(--land-mist)" stopOpacity="0.75" />
          <stop offset="1" stopColor="var(--land-mist)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--land-mist)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--land-mist)" stopOpacity={fade === "strong" ? 0.95 : 0.6} />
        </linearGradient>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--land-sky)" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--land-sky)" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={sunId}>
          <stop offset="0" stopColor="var(--land-sun)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--land-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="360" fill={`url(#${skyId})`} />
      <circle cx="1060" cy="132" r="150" fill={`url(#${sunId})`} opacity="0.55" />
      <circle cx="1060" cy="132" r="46" fill="var(--land-sun)" opacity="0.7" />

      {/* Far peaks */}
      <path
        d="M0 206 C60 192 120 136 186 120 C232 110 262 162 316 160 C386 156 430 70 500 54 C548 44 580 116 640 132 C704 148 748 104 812 96 C884 88 920 156 996 170 C1070 182 1114 112 1188 100 C1256 90 1318 150 1440 140 L1440 360 L0 360 Z"
        fill="var(--land-far)"
      />
      <rect y="150" width="1440" height="110" fill={`url(#${mistId})`} />

      {/* Middle ridge */}
      <path
        d="M0 262 C90 244 152 204 232 198 C302 194 334 232 404 232 C474 232 522 188 592 184 C652 180 694 222 762 228 C842 234 884 212 954 214 C1034 216 1084 246 1164 242 C1252 238 1332 212 1440 218 L1440 360 L0 360 Z"
        fill="var(--land-mid)"
        opacity="0.9"
      />

      {/* Sea */}
      <rect y="284" width="1440" height="76" fill="var(--land-sea)" />
      <g stroke="var(--land-mist)" strokeLinecap="round" opacity="0.7">
        <line x1="560" y1="300" x2="700" y2="300" strokeWidth="1.5" />
        <line x1="760" y1="312" x2="940" y2="312" strokeWidth="1.25" />
        <line x1="620" y1="326" x2="720" y2="326" strokeWidth="1" />
        <line x1="1010" y1="296" x2="1110" y2="296" strokeWidth="1" />
      </g>

      {/* Near headland and forest */}
      <path
        d="M0 292 C58 262 118 226 188 230 C250 234 292 276 362 296 C430 314 520 330 640 350 C660 354 676 358 690 360 L0 360 Z"
        fill="var(--land-near)"
      />
      <path d={FOREST_PATH} fill="var(--land-forest)" />

      <rect y="180" width="1440" height="180" fill={`url(#${fadeId})`} />
    </svg>
  );
}
