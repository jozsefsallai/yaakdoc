import { useCallback, useEffect, useState } from "react";
import { createIsland } from "../island";
import type { EnvironmentOption } from "../types";
import { storage } from "./browser";

export const ENVIRONMENT_STORAGE_KEY = "yaakdoc-environment";
const ENVIRONMENT_EVENT = "yaakdoc:environment";

/**
 * Shows the content variants of one environment. Variants are elements with
 * `data-yd-env="<environment id>"`; `<html data-environment>` drives the CSS (see
 * {@link environmentCss}) and the `hidden` attributes are kept in sync for accessibility.
 */
export function applyEnvironment(id: string) {
  document.documentElement.dataset.environment = id;

  for (const element of document.querySelectorAll<HTMLElement>("[data-yd-env]")) {
    element.hidden = element.dataset.ydEnv !== id;
  }

  storage.set(ENVIRONMENT_STORAGE_KEY, id);

  window.dispatchEvent(new CustomEvent(ENVIRONMENT_EVENT, { detail: id }));
}

/** Headless environment switcher state, synced across switchers and remembered. */
export function useEnvironment(environments: readonly EnvironmentOption[], defaultId: string) {
  const [selected, setSelected] = useState(defaultId);

  useEffect(() => {
    const onChange = (event: Event) => setSelected((event as CustomEvent<string>).detail);

    window.addEventListener(ENVIRONMENT_EVENT, onChange);

    const current = document.documentElement.dataset.environment;
    if (current && current !== defaultId && environments.some((env) => env.id === current)) {
      applyEnvironment(current);
    }

    return () => window.removeEventListener(ENVIRONMENT_EVENT, onChange);
  }, [environments, defaultId]);

  const select = useCallback(
    (id: string) => {
      if (environments.some((env) => env.id === id)) {
        applyEnvironment(id);
      }
    },
    [environments],
  );

  return { selected, select, current: environments.find((env) => env.id === selected) };
}

/** Inline <head> script: applies the remembered environment before first paint. */
export function environmentScript(ids: readonly string[]): string {
  return `(function(){try{var e=localStorage.getItem(${JSON.stringify(ENVIRONMENT_STORAGE_KEY)});if(e&&${JSON.stringify(ids)}.indexOf(e)>=0)document.documentElement.dataset.environment=e}catch(_){}})();`;
}

/** CSS that shows the variants of the environment set on <html> (falls back to `hidden`). */
export function environmentCss(ids: readonly string[]): string {
  return [
    "[data-yd-env]{display:contents}[data-yd-env][hidden]{display:none}",
    ...ids.map((id) => {
      const value = JSON.stringify(id);
      return `html[data-environment=${value}] [data-yd-env]:not([data-yd-env=${value}]){display:none}html[data-environment=${value}] [data-yd-env=${value}]{display:contents}`;
    }),
  ].join("");
}

export type EnvironmentSwitcherProps = {
  environments: EnvironmentOption[];
  defaultId: string;
  className?: string;
  label?: string;
};

function EnvironmentSwitcherImpl({
  environments,
  defaultId,
  className,
  label = "Environment",
}: EnvironmentSwitcherProps) {
  const { selected, select } = useEnvironment(environments, defaultId);

  return (
    <select
      data-yd="environment-switcher"
      className={className}
      aria-label={label}
      value={selected}
      onChange={(event) => select(event.target.value)}
    >
      {environments.map((env) => (
        <option key={env.id} value={env.id}>
          {env.name}
        </option>
      ))}
    </select>
  );
}

/** Unstyled environment switcher (native select). */
export const EnvironmentSwitcher = createIsland("yd:environment-switcher", EnvironmentSwitcherImpl);
