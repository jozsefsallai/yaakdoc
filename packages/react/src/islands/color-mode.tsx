import { useCallback, useSyncExternalStore } from "react";
import { createIsland } from "../island";
import type { ColorMode, ColorModePreference } from "../types";
import { storage } from "./browser";

export const COLOR_MODE_STORAGE_KEY = "yaakdoc-color-mode";

function readPreference(): ColorModePreference | null {
  const value = storage.get(COLOR_MODE_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

const systemMode = (): ColorMode =>
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

/** Applies a preference to <html data-theme> and persists it. */
export function applyColorMode(preference: ColorModePreference) {
  const resolved = preference === "system" ? systemMode() : preference;

  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.colorMode = preference;
  root.style.colorScheme = resolved;

  storage.set(COLOR_MODE_STORAGE_KEY, preference);
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-color-mode"],
  });

  window.addEventListener("storage", callback);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", callback);
  };
}

const getSnapshot = () =>
  `${document.documentElement.dataset.colorMode ?? readPreference() ?? "system"}|${document.documentElement.dataset.theme ?? systemMode()}`;

/**
 * Headless color mode state. Hydration-safe: renders `fallback` on the server and during hydration,
 * then switches to the real value.
 */
export function useColorMode(fallback: ColorModePreference = "system") {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => `${fallback}|light`);

  const [preference, resolved] = snapshot.split("|") as [ColorModePreference, ColorMode];

  const setPreference = useCallback((next: ColorModePreference) => applyColorMode(next), []);

  const toggle = useCallback(
    () => applyColorMode(resolved === "dark" ? "light" : "dark"),
    [resolved],
  );

  return { preference, resolved, setPreference, toggle };
}

/**
 * Inline script for <head> that applies the stored/system color mode before first paint, and keeps
 * following the system setting while the preference is "system".
 */
export function colorModeScript(defaultMode: ColorModePreference): string {
  return `(function(){try{var k=${JSON.stringify(COLOR_MODE_STORAGE_KEY)},d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)"),p;try{p=localStorage.getItem(k)}catch(e){}if(p!=="light"&&p!=="dark"&&p!=="system")p=${JSON.stringify(defaultMode)};function a(){var r=p==="system"?(m.matches?"dark":"light"):p;d.dataset.theme=r;d.dataset.colorMode=p;d.style.colorScheme=r}a();m.addEventListener("change",function(){var s;try{s=localStorage.getItem(k)}catch(e){}if(!s||s==="system"){p="system";a()}})}catch(e){}})();`;
}

export type ColorModeToggleProps = {
  className?: string;
  label?: string;
};

function ColorModeToggleImpl({ className, label = "Toggle color mode" }: ColorModeToggleProps) {
  const { resolved, toggle } = useColorMode();

  return (
    <button
      type="button"
      data-yd="color-mode-toggle"
      data-mode={resolved}
      className={className}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <span data-yd-icon="light" aria-hidden="true">
        ☀
      </span>

      <span data-yd-icon="dark" aria-hidden="true">
        ☾
      </span>
    </button>
  );
}

/** Unstyled light/dark toggle. Both icons are rendered; show one via `[data-theme]` CSS. */
export const ColorModeToggle = createIsland("yd:color-mode-toggle", ColorModeToggleImpl);
