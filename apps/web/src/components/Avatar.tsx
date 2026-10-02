/**
 * A stand-in picture for someone, derived from their handle or address. The same
 * name always produces the same colour, so a recipient is recognisable in a list
 * before you have read the label.
 */
const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

function hue(seed: string): number {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return hash;
}

/** Up to two characters: "@sam_01" → "SA", a bare address → its first two hex digits. */
function initials(seed: string): string {
  const name = seed.replace(/^[@+]/, "");
  if (name.startsWith("0x")) return name.slice(2, 4).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ seed, size = "md" }: { seed: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizes[size]}`}
      style={{ backgroundColor: `hsl(${hue(seed)} 52% 42%)` }}
    >
      {initials(seed)}
    </span>
  );
}
