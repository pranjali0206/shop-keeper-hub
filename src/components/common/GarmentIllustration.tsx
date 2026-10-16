import type { GarmentKind } from "@/lib/catalog";
import { colorSwatch } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Simple flat garment silhouettes used as image placeholders until real
// photos are uploaded. Colors are illustration content, so they live here
// rather than in the theme tokens.
const BACKDROPS = ["#EDEDED", "#E2E2E2", "#F4F4F4", "#D9D9D9", "#E8E8E8", "#F0F0F0"];

const PATHS: Record<GarmentKind, string> = {
  tee: "M70 52 L92 40 Q100 52 108 40 L130 52 L158 80 L140 98 L130 90 L130 196 L70 196 L70 90 L60 98 L42 80 Z",
  shirt:
    "M72 48 L92 38 L100 52 L108 38 L128 48 L150 66 L162 150 L144 154 L132 92 L132 200 L68 200 L68 92 L56 154 L38 150 L50 66 Z",
  hoodie:
    "M74 58 Q78 26 100 24 Q122 26 126 58 L148 70 L162 156 L144 160 L132 100 L132 200 L68 200 L68 100 L56 160 L38 156 L52 70 Z",
  jacket:
    "M72 48 L90 38 L100 60 L110 38 L128 48 L152 66 L162 160 L144 162 L134 96 L134 196 L66 196 L66 96 L56 162 L38 160 L48 66 Z",
  kurta:
    "M76 44 L92 36 Q100 44 108 36 L124 44 L146 62 L156 142 L140 146 L130 92 L138 214 L62 214 L70 92 L60 146 L44 142 L54 62 Z",
  jeans: "M66 34 L134 34 L142 210 L110 210 L100 92 L90 210 L58 210 Z",
  trousers: "M68 34 L132 34 L138 210 L108 210 L100 96 L92 210 L62 210 Z",
  shoe: "M36 140 Q40 110 62 108 L92 104 Q104 120 130 124 L160 132 Q170 138 168 152 L36 152 Z",
  cap: "M48 128 Q52 76 100 74 Q148 76 152 128 Z M40 128 L178 128 Q176 140 160 140 L40 140 Z",
};

const DETAILS: Partial<Record<GarmentKind, string>> = {
  shirt: "M100 52 L100 200 M92 38 L100 52 L108 38",
  jacket: "M100 60 L100 196 M86 120 L96 120 M104 120 L114 120",
  kurta: "M100 44 L100 110 M96 60 L104 60 M96 76 L104 76 M96 92 L104 92",
  hoodie: "M86 56 Q100 70 114 56 M92 64 L90 92 M108 64 L110 92 M80 150 L120 150 L120 176 L80 176 Z",
  jeans: "M66 50 L134 50 M100 34 L100 92 M74 60 Q84 72 96 62 M104 62 Q116 72 126 60",
  trousers: "M68 50 L132 50 M100 34 L100 96",
  tee: "M90 44 Q100 60 110 44",
  shoe: "M36 146 L168 146 M70 112 L80 128 M84 108 L94 126",
};

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function GarmentIllustration({
  kind,
  color,
  seed = "",
  label,
  className,
  cutout = false,
}: {
  kind: GarmentKind;
  color: string | null | undefined;
  seed?: string;
  label: string;
  className?: string;
  /** No backdrop, garment fitted inside the box (for cut-out style strips). */
  cutout?: boolean;
}) {
  const backdrop = BACKDROPS[hash(seed || kind) % BACKDROPS.length];
  const fill = colorSwatch(color);
  const detail = DETAILS[kind];
  return (
    <svg
      viewBox="0 0 200 240"
      role="img"
      aria-label={label}
      preserveAspectRatio={cutout ? "xMidYMid meet" : "xMidYMid slice"}
      className={cn("h-full w-full", className)}
    >
      {cutout ? null : <rect width="200" height="240" fill={backdrop} />}
      <ellipse cx="100" cy="222" rx="62" ry="8" fill="#0D0D0D" opacity="0.08" />
      <path
        d={PATHS[kind]}
        fill={fill}
        stroke="#0D0D0D"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {detail ? (
        <path
          d={detail}
          fill="none"
          stroke="#0D0D0D"
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
