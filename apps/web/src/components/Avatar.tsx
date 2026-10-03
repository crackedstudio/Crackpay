/**
 * A stand-in picture for someone, derived from their handle or address. The same
 * name always produces the same colour, so a recipient is recognisable in a list
 * before you have read the label.
 *
 * Circles are people; squircles are apps. See `AppIcon`.
 */
const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-[2.625rem] w-[2.625rem] text-[0.8125rem]",
  lg: "h-13 w-13 text-[0.9375rem]",
  xl: "h-16 w-16 text-xl",
} as const;

/**
 * Ten curated earth hues rather than a sweep of the whole colour wheel: a
 * random hue lands on green often enough to matter, and green in this product
 * means money or "go". None of these do.
 */
export const AVATAR_PALETTE = [
  { bg: "#c4552d", fg: "#ffffff" },
  { bg: "#d9a02b", fg: "#12100e" },
  { bg: "#3d4fa3", fg: "#ffffff" },
  { bg: "#7a3b69", fg: "#ffffff" },
  { bg: "#1f6f78", fg: "#ffffff" },
  { bg: "#c9b48a", fg: "#12100e" },
  { bg: "#b8475e", fg: "#ffffff" },
  { bg: "#4a5560", fg: "#ffffff" },
  { bg: "#2563a8", fg: "#ffffff" },
  { bg: "#7a4e2d", fg: "#ffffff" },
] as const;

export function paletteFor(seed: string): (typeof AVATAR_PALETTE)[number] {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

/** Up to two characters: "@sam_01" → "SA", a bare address → its first two hex digits. */
function initials(seed: string): string {
  const name = seed.replace(/^[@+]/, "");
  if (name.startsWith("0x")) return name.slice(2, 4).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  seed,
  size = "md",
  /** An ink ring, for an avatar standing on its own rather than inside a list. */
  ring = false,
}: {
  seed: string;
  size?: keyof typeof sizes;
  ring?: boolean;
}) {
  const { bg, fg } = paletteFor(seed);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${
        ring ? "border-[1.5px] border-ink" : ""
      }`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials(seed)}
    </span>
  );
}
