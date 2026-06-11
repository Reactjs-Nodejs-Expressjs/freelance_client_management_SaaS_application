export interface PremiumColor {
  name: string;
  value: string;
}

export const PREMIUM_COLORS: PremiumColor[] = [
  // Slate
  { name: "Slate 400", value: "#94a3b8" },
  { name: "Slate 500", value: "#64748b" },
  { name: "Slate 600", value: "#475569" },
  { name: "Slate 700", value: "#334155" },
  { name: "Slate 800", value: "#1e293b" },
  // Gray
  { name: "Gray 400", value: "#9ca3af" },
  { name: "Gray 500", value: "#6b7280" },
  { name: "Gray 600", value: "#4b5563" },
  { name: "Gray 700", value: "#374151" },
  { name: "Gray 800", value: "#1f2937" },
  // Zinc
  { name: "Zinc 400", value: "#a1a1aa" },
  { name: "Zinc 500", value: "#71717a" },
  { name: "Zinc 600", value: "#52525b" },
  { name: "Zinc 700", value: "#3f3f46" },
  { name: "Zinc 800", value: "#27272a" },
  // Neutral
  { name: "Neutral 400", value: "#a3a3a3" },
  { name: "Neutral 500", value: "#737373" },
  { name: "Neutral 600", value: "#525252" },
  { name: "Neutral 700", value: "#404040" },
  { name: "Neutral 800", value: "#262626" },
  // Stone
  { name: "Stone 400", value: "#a8a29e" },
  { name: "Stone 500", value: "#78716c" },
  { name: "Stone 600", value: "#57534e" },
  { name: "Stone 700", value: "#44403c" },
  { name: "Stone 800", value: "#292524" },
  // Red
  { name: "Red 400", value: "#f87171" },
  { name: "Red 500", value: "#ef4444" },
  { name: "Red 600", value: "#dc2626" },
  { name: "Red 700", value: "#b91c1c" },
  { name: "Red 800", value: "#991b1b" },
  { name: "Red 900", value: "#7f1d1d" },
  // Orange
  { name: "Orange 400", value: "#fb923c" },
  { name: "Orange 500", value: "#f97316" },
  { name: "Orange 600", value: "#ea580c" },
  { name: "Orange 700", value: "#c2410c" },
  { name: "Orange 800", value: "#9a3412" },
  { name: "Orange 900", value: "#7c2d12" },
  // Amber
  { name: "Amber 400", value: "#fbbf24" },
  { name: "Amber 500", value: "#f59e0b" },
  { name: "Amber 600", value: "#d97706" },
  { name: "Amber 700", value: "#b45309" },
  { name: "Amber 800", value: "#92400e" },
  { name: "Amber 900", value: "#78350f" },
  // Yellow
  { name: "Yellow 400", value: "#facc15" },
  { name: "Yellow 500", value: "#eab308" },
  { name: "Yellow 600", value: "#ca8a04" },
  { name: "Yellow 700", value: "#a16207" },
  { name: "Yellow 900", value: "#713f12" },
  // Lime
  { name: "Lime 400", value: "#a3e635" },
  { name: "Lime 500", value: "#84cc16" },
  { name: "Lime 600", value: "#65a30d" },
  { name: "Lime 700", value: "#4d7c0f" },
  { name: "Lime 900", value: "#365314" },
  // Green
  { name: "Green 400", value: "#4ade80" },
  { name: "Green 500", value: "#22c55e" },
  { name: "Green 600", value: "#16a34a" },
  { name: "Green 700", value: "#15803d" },
  { name: "Green 800", value: "#166534" },
  { name: "Green 900", value: "#14532d" },
  // Emerald
  { name: "Emerald 400", value: "#34d399" },
  { name: "Emerald 500", value: "#10b981" },
  { name: "Emerald 600", value: "#059669" },
  { name: "Emerald 700", value: "#047857" },
  { name: "Emerald 800", value: "#065f46" },
  { name: "Emerald 900", value: "#064e3b" },
  // Teal
  { name: "Teal 400", value: "#2dd4bf" },
  { name: "Teal 500", value: "#14b8a6" },
  { name: "Teal 600", value: "#0d9488" },
  { name: "Teal 700", value: "#0f766e" },
  { name: "Teal 800", value: "#115e59" },
  { name: "Teal 900", value: "#134e4a" },
  // Cyan
  { name: "Cyan 400", value: "#22d3ee" },
  { name: "Cyan 500", value: "#06b6d4" },
  { name: "Cyan 600", value: "#0891b2" },
  { name: "Cyan 700", value: "#0e7490" },
  { name: "Cyan 800", value: "#155e75" },
  { name: "Cyan 900", value: "#164e63" },
  // Sky
  { name: "Sky 400", value: "#38bdf8" },
  { name: "Sky 500", value: "#0ea5e9" },
  { name: "Sky 600", value: "#0284c7" },
  { name: "Sky 700", value: "#0369a1" },
  { name: "Sky 800", value: "#075985" },
  { name: "Sky 900", value: "#0c4a6e" },
  // Blue
  { name: "Blue 400", value: "#60a5fa" },
  { name: "Blue 500", value: "#3b82f6" },
  { name: "Blue 600", value: "#2563eb" },
  { name: "Blue 700", value: "#1d4ed8" },
  { name: "Blue 800", value: "#1e40af" },
  { name: "Blue 900", value: "#1e3a8a" },
  // Indigo
  { name: "Indigo 400", value: "#818cf8" },
  { name: "Indigo 500", value: "#6366f1" },
  { name: "Indigo 600", value: "#4f46e5" },
  { name: "Indigo 700", value: "#4338ca" },
  { name: "Indigo 800", value: "#3730a3" },
  { name: "Indigo 900", value: "#312e81" },
  // Violet
  { name: "Violet 400", value: "#a78bfa" },
  { name: "Violet 500", value: "#8b5cf6" },
  { name: "Violet 600", value: "#7c3aed" },
  { name: "Violet 700", value: "#6d28d9" },
  { name: "Violet 800", value: "#5b21b6" },
  { name: "Violet 900", value: "#4c1d95" },
  // Purple
  { name: "Purple 400", value: "#c084fc" },
  { name: "Purple 500", value: "#a855f7" },
  { name: "Purple 600", value: "#9333ea" },
  { name: "Purple 700", value: "#7e22ce" },
  { name: "Purple 800", value: "#6b21a8" },
  { name: "Purple 900", value: "#581c87" },
  // Fuchsia
  { name: "Fuchsia 400", value: "#e879f9" },
  { name: "Fuchsia 500", value: "#d946ef" },
  { name: "Fuchsia 600", value: "#c026d3" },
  { name: "Fuchsia 700", value: "#a21caf" },
  { name: "Fuchsia 800", value: "#86198f" },
  { name: "Fuchsia 900", value: "#701a75" },
  // Pink
  { name: "Pink 400", value: "#f472b6" },
  { name: "Pink 500", value: "#ec4899" },
  { name: "Pink 600", value: "#db2777" },
  { name: "Pink 700", value: "#be185d" },
  { name: "Pink 800", value: "#9d174d" },
  { name: "Pink 900", value: "#831843" },
  // Rose
  { name: "Rose 400", value: "#fb7185" },
  { name: "Rose 500", value: "#f43f5e" },
  { name: "Rose 600", value: "#e11d48" },
  { name: "Rose 700", value: "#be123c" },
  { name: "Rose 800", value: "#9f1239" },
  { name: "Rose 900", value: "#881337" }
];

export function getColorForClient(clientName: string): string {
  if (!clientName) return "#3b82f6";
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PREMIUM_COLORS.length;
  return PREMIUM_COLORS[index].value;
}

export function getRandomColor(): string {
  const index = Math.floor(Math.random() * PREMIUM_COLORS.length);
  return PREMIUM_COLORS[index].value;
}
