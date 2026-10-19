import { useCallback, useEffect, useState } from "react";
import { createIsland } from "../island";

/** Headless open/close state for a navigation element (`data-open` is set on the target). */
export function useNavToggle(target: string) {
  const [open, setOpen] = useState(false);

  const set = useCallback(
    (next: boolean) => {
      setOpen(next);

      const element = document.querySelector<HTMLElement>(target);
      if (element) {
        element.dataset.open = String(next);
      }

      document.documentElement.dataset.navOpen = String(next);
    },
    [target],
  );

  useEffect(() => {
    const element = document.querySelector<HTMLElement>(target);

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && set(false);
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("a")) {
        set(false);
      }
    };

    window.addEventListener("keydown", onKey);
    element?.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("keydown", onKey);
      element?.removeEventListener("click", onClick);
    };
  }, [target, set]);

  return { open, setOpen: set, toggle: () => set(!open) };
}

export type NavToggleProps = { target: string; label?: string; className?: string };

function NavToggleImpl({ target, label = "Toggle navigation", className }: NavToggleProps) {
  const { open, toggle } = useNavToggle(target);

  return (
    <button
      type="button"
      data-yd="nav-toggle"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      aria-label={label}
      className={className}
      onClick={toggle}
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}

/** Unstyled menu button for small screens. */
export const NavToggle = createIsland("yd:nav-toggle", NavToggleImpl);

/**
 * Filters `[data-yd-nav-item]` elements inside `target` by their text. Folders
 * (`[data-yd-nav-folder]`) without visible matches are hidden; matching folders are expanded.
 */
export function filterNav(target: string, query: string) {
  const root = document.querySelector(target);
  if (!root) {
    return 0;
  }

  const needle = query.trim().toLowerCase();

  let visible = 0;

  for (const item of root.querySelectorAll<HTMLElement>("[data-yd-nav-item]")) {
    const text = (item.dataset.ydNavLabel ?? item.textContent ?? "").toLowerCase();

    const match = !needle || text.includes(needle);
    item.hidden = !match;

    if (match) {
      visible++;
    }
  }

  const folders = [...root.querySelectorAll<HTMLElement>("[data-yd-nav-folder]")].reverse();

  for (const folder of folders) {
    const label = (folder.dataset.ydNavLabel ?? "").toLowerCase();

    const hasMatch =
      !needle ||
      label.includes(needle) ||
      folder.querySelector("[data-yd-nav-item]:not([hidden])") !== null;

    folder.hidden = !hasMatch;

    if (needle && hasMatch) {
      folder.querySelector("details")?.setAttribute("open", "");
      // Folder name matched: show all its children.
      if (label.includes(needle)) {
        for (const child of folder.querySelectorAll<HTMLElement>("[hidden]")) {
          child.hidden = false;
        }
      }
    }
  }

  return visible;
}

export type NavFilterProps = {
  target: string;
  placeholder?: string;
  className?: string;
  shortcut?: string;
};

function NavFilterImpl({
  target,
  placeholder = "Filter...",
  className,
  shortcut = "/",
}: NavFilterProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;

      if (event.key !== shortcut || active?.matches("input, textarea, [contenteditable]")) {
        return;
      }

      event.preventDefault();
      document.querySelector<HTMLInputElement>('[data-yd="nav-filter"]')?.focus();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  return (
    <input
      type="search"
      data-yd="nav-filter"
      className={className}
      placeholder={placeholder}
      aria-label={placeholder}
      value={query}
      onChange={(event) => {
        setQuery(event.target.value);
        filterNav(target, event.target.value);
      }}
    />
  );
}

/** Unstyled filter input for the navigation. Press `/` to focus. */
export const NavFilter = createIsland("yd:nav-filter", NavFilterImpl);

/**
 * Highlights the navigation link of the section currently in view (single-page mode). Sections are
 * elements with `data-yd-section`; links are `a[href="#<id>"]` inside `target`.
 */
export function useScrollSpy(target: string) {
  useEffect(() => {
    const nav = document.querySelector(target);
    const sections = document.querySelectorAll<HTMLElement>("[data-yd-section]");
    if (!nav || sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    let current: Element | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!top) {
          return;
        }

        const link = nav.querySelector(`a[href$="#${CSS.escape(top.target.id)}"]`);
        if (!link || link === current) {
          return;
        }

        current?.removeAttribute("aria-current");
        link.setAttribute("aria-current", "location");
        current = link;

        // Expand collapsed folders containing the current section.
        for (let el = link.parentElement; el && el !== nav; el = el.parentElement) {
          if (el instanceof HTMLDetailsElement && !el.open) {
            el.open = true;
          }
        }
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [target]);
}

function ScrollSpyImpl({ target }: { target: string }) {
  useScrollSpy(target);
  return null;
}

/** Renders nothing; marks the active nav link while scrolling. */
export const ScrollSpy = createIsland("yd:scroll-spy", ScrollSpyImpl);
