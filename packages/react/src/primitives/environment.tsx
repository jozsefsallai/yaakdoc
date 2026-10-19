import type { ReactNode } from "react";
import { useDocument } from "../context";
import { EnvironmentSwitcher } from "../islands/environment";
import { overridable } from "../overrides";

/**
 * Renders environment-dependent content once per environment variant. With several variants, each
 * is wrapped in `<div data-yd-env="<id>">` (only the default is visible until the reader switches).
 */
export function EnvironmentVariants<T extends { environmentId: string | null }>({
  variants,
  children,
}: {
  variants: readonly T[];
  children: (variant: T, index: number) => ReactNode;
}) {
  if (variants.length <= 1) {
    return <>{variants[0] ? children(variants[0], 0) : null}</>;
  }

  return (
    <>
      {variants.map((variant, index) => (
        <div
          key={variant.environmentId ?? "none"}
          data-yd-env={variant.environmentId ?? ""}
          hidden={index !== 0}
        >
          {children(variant, index)}
        </div>
      ))}
    </>
  );
}

/** Environment switcher for the current document (renders nothing without alternatives). */
export const EnvironmentSelect = overridable(
  "EnvironmentSelect",
  function EnvironmentSelect({ className }: { className?: string }) {
    const document = useDocument();
    if (document.environments.length < 2) {
      return null;
    }

    return (
      <EnvironmentSwitcher
        environments={document.environments}
        defaultId={document.environments[0]!.id}
        {...(className ? { className } : {})}
      />
    );
  },
);
