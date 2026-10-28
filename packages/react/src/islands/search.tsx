import type { SearchEntry } from "@yaakdoc/core";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createIsland } from "../island";

export type { SearchEntry };

const SEARCH_EVENT = "yaakdoc:search";

/** Opens the search dialog (any search island listening on the page). */
export function openSearch() {
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT));
}

const words = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Score of one term against an entry (0: no match). */
function scoreTerm(entry: SearchEntry, term: string): number {
  const title = entry.title.toLowerCase();

  if (title === term) {
    return 100;
  }

  if (title.startsWith(term)) {
    return 60;
  }

  if (words(title).some((word) => word.startsWith(term))) {
    return 40;
  }

  if (entry.method?.toLowerCase() === term) {
    return 30;
  }

  if (title.includes(term)) {
    return 25;
  }

  if (entry.section.toLowerCase().includes(term)) {
    return 10;
  }

  return entry.description.toLowerCase().includes(term) ? 5 : 0;
}

/**
 * Searches entries by title, method, section and description. Every term must match; titles rank
 * above sections and descriptions, and exact/prefix matches above matches inside words.
 */
export function searchEntries(
  entries: readonly SearchEntry[],
  query: string,
  limit = 20,
): SearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  const scored: Array<{ entry: SearchEntry; score: number }> = [];

  for (const entry of entries) {
    let score = 0;

    for (const term of terms) {
      const termScore = scoreTerm(entry, term);

      if (termScore === 0) {
        score = 0;
        break;
      }

      score += termScore;
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

const indexes = new Map<string, Promise<SearchEntry[]>>();

function loadIndex(url: string): Promise<SearchEntry[]> {
  let index = indexes.get(url);

  if (!index) {
    index = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<SearchEntry[]>;
      })
      .catch((error) => {
        indexes.delete(url);
        throw error;
      });

    indexes.set(url, index);
  }

  return index;
}

/**
 * Headless search: loads the index from `url` once `enabled` (e.g. when the dialog opens), and
 * keeps the query, results and the highlighted result. `onKeyDown` handles ↑/↓ and Enter.
 */
export function useSearch(url: string, { enabled = true, limit = 20 } = {}) {
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQueryState] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!enabled || entries) {
      return;
    }

    let cancelled = false;

    loadIndex(url).then(
      (loaded) => !cancelled && setEntries(loaded),
      () => !cancelled && setError(true),
    );

    return () => {
      cancelled = true;
    };
  }, [url, enabled, entries]);

  const results = useMemo(
    () => (entries ? searchEntries(entries, query, limit) : []),
    [entries, query, limit],
  );

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setActive(0);
  }, []);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) =>
          results.length === 0 ? 0 : (current + step + results.length) % results.length,
        );
      } else if (event.key === "Enter" && results[active]) {
        event.preventDefault();
        window.location.assign(results[active].href);
      }
    },
    [results, active],
  );

  return {
    query,
    setQuery,
    results,
    active,
    setActive,
    onKeyDown,
    loading: enabled && !entries && !error,
    error,
  };
}

/** Cmd+K / Ctrl+K and `/` (outside text fields) open the search. */
function isSearchShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    return true;
  }

  const target = event.target as HTMLElement | null;

  return (
    event.key === "/" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !target?.closest("input, textarea, select, [contenteditable]")
  );
}

/**
 * Open state of a search dialog, opened by {@link openSearch} and the keyboard shortcuts.
 * `restoreFocus()` focuses the element that had focus before opening, without scrolling.
 */
export function useSearchDialog() {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const remember = () => {
      const active = document.activeElement;

      if (active instanceof HTMLElement && !active.closest("[role=dialog], dialog")) {
        previousFocus.current = active;
      }
    };

    const onOpen = () => {
      remember();
      setOpen(true);
    };

    const onKey = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        remember();
        setOpen((current) => !current || event.key === "/");
      }
    };

    window.addEventListener(SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener(SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const restoreFocus = useCallback(() => {
    previousFocus.current?.focus({ preventScroll: true });
    previousFocus.current = null;
  }, []);

  return { open, setOpen, restoreFocus };
}

/**
 * Inline <head> script: sets `<html data-platform="apple|other">` before first paint, so
 * platform-specific labels (see {@link SearchShortcut}) render right away.
 */
export const platformScript =
  '(function(){try{var n=navigator,p=(n.userAgentData&&n.userAgentData.platform)||n.platform||"";document.documentElement.dataset.platform=/mac|iphone|ipad|ipod/i.test(p)?"apple":"other"}catch(e){}})();';

/** CSS that shows the `[data-yd-platform]` variant matching `<html data-platform>`. */
export const platformCss =
  '[data-yd-platform="apple"]{display:none}html[data-platform="apple"] [data-yd-platform="apple"]{display:inline}html[data-platform="apple"] [data-yd-platform="other"]{display:none}';

/**
 * The search shortcut, `Cmd+K` on Apple platforms and `Ctrl K` elsewhere. Both are rendered and CSS
 * shows the right one (see {@link platformScript}), so the label doesn't change when hydrating.
 */
export function SearchShortcut() {
  return (
    <>
      <span data-yd-platform="apple">Cmd</span>
      <span data-yd-platform="other">Ctrl </span>K
    </>
  );
}

/**
 * `Cmd+K` on Apple platforms, `Ctrl K` elsewhere, as a string (e.g. for `title`). It's `Cmd+K` until
 * hydrated; render {@link SearchShortcut} for visible labels.
 */
export function useSearchShortcutLabel() {
  const [label, setLabel] = useState("Cmd+K");

  useEffect(() => {
    if (document.documentElement.dataset.platform === "other") {
      setLabel("Ctrl K");
    }
  }, []);

  return label;
}

export type SearchTriggerProps = { label?: string; className?: string };

function SearchTriggerImpl({ label = "Search", className }: SearchTriggerProps) {
  return (
    <button
      type="button"
      data-yd="search-trigger"
      className={className}
      aria-haspopup="dialog"
      onClick={openSearch}
    >
      <span>{label}</span>{" "}
      <kbd>
        <SearchShortcut />
      </kbd>
    </button>
  );
}

/** Unstyled button that opens the search dialog. */
export const SearchTrigger = createIsland("yd:search-trigger", SearchTriggerImpl);

export type SearchDialogProps = { url: string; placeholder?: string; className?: string };

function SearchDialogImpl({ url, placeholder = "Search the docs", className }: SearchDialogProps) {
  const { open, setOpen } = useSearchDialog();
  const search = useSearch(url, { enabled: open });
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;

    if (open && element && !element.open) {
      element.showModal();
    } else if (!open && element?.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      data-yd="search-dialog"
      className={className}
      aria-label="Search"
      onClose={() => setOpen(false)}
    >
      <input
        type="search"
        data-yd="search-input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={search.onKeyDown}
      />

      <ul data-yd="search-results">
        {search.results.map((entry, index) => (
          <li key={entry.href} data-kind={entry.kind}>
            <a
              href={entry.href}
              aria-current={index === search.active ? "true" : undefined}
              onMouseEnter={() => search.setActive(index)}
            >
              {entry.method ? <span data-yd="method">{entry.method}</span> : null}
              <span data-yd="search-title">{entry.title}</span>
              {entry.section ? <span data-yd="search-section">{entry.section}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </dialog>
  );
}

/** Unstyled search dialog (native `<dialog>`), opened by Cmd+K / Ctrl+K, `/` or a {@link SearchTrigger}. */
export const SearchDialog = createIsland("yd:search-dialog", SearchDialogImpl);
