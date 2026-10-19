import { useCallback, useEffect, useRef, useState } from "react";
import { createIsland } from "../island";

export type CopySource = {
  /** Literal text to copy. */
  text?: string;
  /** CSS selector of an element whose text content is copied. */
  target?: string;
  /** URL whose response body is copied (e.g. a page's Markdown twin). */
  url?: string;
};

async function resolveCopyText(source: CopySource): Promise<string> {
  if (source.text !== undefined) {
    return source.text;
  }

  if (source.url) {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }

    return response.text();
  }

  if (source.target) {
    // Prefer the first visible match (e.g. the selected tab of the selected environment).
    const matches = [...document.querySelectorAll<HTMLElement>(source.target)];
    const element = matches.find((el) => el.getClientRects().length > 0) ?? matches[0];
    return element?.textContent ?? "";
  }

  return "";
}

/** Headless copy-to-clipboard state. `copied` resets after `timeout` ms. */
export function useCopy(timeout = 2000) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (source: CopySource) => {
      try {
        // Safari requires the clipboard write to start synchronously within the gesture.
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": resolveCopyText(source).then(
                (text) => new Blob([text], { type: "text/plain" }),
              ),
            }),
          ]);
        } else {
          await navigator.clipboard.writeText(await resolveCopyText(source));
        }

        setState("copied");
      } catch (error) {
        console.error("[yaakdoc] Copy failed", error);
        setState("error");
      }

      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), timeout);
    },
    [timeout],
  );

  return { state, copied: state === "copied", copy };
}

export type CopyButtonProps = CopySource & {
  label?: string;
  copiedLabel?: string;
  className?: string;
};

function CopyButtonImpl({
  label = "Copy",
  copiedLabel = "Copied!",
  className,
  ...source
}: CopyButtonProps) {
  const { state, copy } = useCopy();
  return (
    <button
      type="button"
      data-yd="copy-button"
      data-state={state}
      className={className}
      onClick={() => copy(source)}
      aria-live="polite"
    >
      {state === "copied" ? copiedLabel : label}
    </button>
  );
}

/** Unstyled copy button. Copies `text`, the text of `target`, or the body of `url`. */
export const CopyButton = createIsland("yd:copy-button", CopyButtonImpl);
