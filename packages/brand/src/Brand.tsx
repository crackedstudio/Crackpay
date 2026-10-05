import type { SVGProps } from "react";

/**
 * One square, one crack. The crack is a single stepped line, so it survives at
 * 16px and reads as a split, a bolt and a path at once. It is drawn in ink and
 * never in green — green is reserved for money and "go".
 */
export function Mark({ className = "h-7 w-[1.7rem]", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 33 34" fill="currentColor" aria-hidden className={`shrink-0 ${className}`} {...props}>
      <path d="M7 0H18L12 15L19 17.5L13 32H7A7 7 0 0 1 0 25V7A7 7 0 0 1 7 0Z" />
      <path
        d="M21.5 0H25A7 7 0 0 1 32 7V25A7 7 0 0 1 25 32H16.5L22.5 17.5L15.5 15Z"
        transform="translate(0.9 1.4)"
      />
    </svg>
  );
}

/** The mark beside the name, locked up at the proportions on the brand sheet. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark />
      <span className="display text-xl">CrackPay</span>
    </span>
  );
}
