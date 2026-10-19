/** Browser helpers shared by the islands. */

/** `localStorage` access that never throws (private mode, blocked storage...). */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Unavailable: the choice lasts for this page view.
    }
  },
};

/** Resolves a (possibly relative) URL against the current page. */
export const resolveUrl = (url: string) => new URL(url, window.location.href).href;
