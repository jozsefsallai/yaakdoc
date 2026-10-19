import type { ComponentPropsWithoutRef } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Clamps any number to a valid heading level (1–6). */
export const clampHeadingLevel = (level: number) => Math.min(Math.max(level, 1), 6) as HeadingLevel;

/** `<h1>`–`<h6>` chosen by `level` (clamped), for headings whose depth depends on nesting. */
export function Heading({ level, ...props }: { level: number } & ComponentPropsWithoutRef<"h2">) {
  const Tag = `h${clampHeadingLevel(level)}` as const;
  return <Tag {...props} />;
}
