import { useCallback, useEffect, useState } from "react";
import { createIsland } from "../island";
import { storage } from "./browser";

export const TAB_STORAGE_KEY = "yaakdoc-tab";

/** Tab group names of a request's code examples and example responses. */
export const tabGroupIds = {
  examples: (anchor: string) => `ex-${anchor}`,
  responses: (anchor: string) => `res-${anchor}`,
};

/** Ids linking a tab to its panel. `variant` tells apart copies of a panel (one per environment). */
export function tabElementIds(group: string, id: string, variant = 0) {
  return {
    tab: `${group}-tab-${id}`,
    panel: `${group}-panel-${id}${variant ? `-${variant}` : ""}`,
  };
}

/** Props for a server-rendered panel controlled by {@link TabList}. */
export function tabPanelProps(
  group: string,
  id: string,
  options: { selected: boolean; variant?: number },
) {
  const ids = tabElementIds(group, id, options.variant);

  return {
    role: "tabpanel",
    id: ids.panel,
    "aria-labelledby": ids.tab,
    "data-yd-tab-panel": id,
    hidden: !options.selected,
  } as const;
}

/** Selector of an element (default: the code) inside the visible panel of a tab group. */
export const visibleTabPanelSelector = (group: string, inner = "pre") =>
  `[data-yd-tab-group="${group}"] [data-yd-tab-panel]:not([hidden]) ${inner}`;

const TAB_EVENT = "yaakdoc:tab";

function showPanel(group: string, id: string) {
  const container = document.querySelector(`[data-yd-tab-group="${CSS.escape(group)}"]`);
  if (!container) {
    return;
  }

  for (const panel of container.querySelectorAll<HTMLElement>("[data-yd-tab-panel]")) {
    panel.hidden = panel.dataset.ydTabPanel !== id;
  }
}

/**
 * Headless tab state for a panel group rendered on the server. Panels are elements with
 * `data-yd-tab-panel="<id>"` inside `[data-yd-tab-group="<group>"]`. The selection is synced across
 * all groups on the page (pick "Python" once, see Python everywhere) and remembered.
 */
export function useTabs(group: string, ids: readonly string[], sync = true) {
  const [selected, setSelected] = useState(ids[0] ?? "");

  const select = useCallback(
    (id: string, broadcast = true) => {
      if (!ids.includes(id)) {
        return;
      }

      setSelected(id);
      showPanel(group, id);

      if (sync && broadcast) {
        storage.set(TAB_STORAGE_KEY, id);

        window.dispatchEvent(new CustomEvent(TAB_EVENT, { detail: { id, group } }));
      }
    },
    [group, ids, sync],
  );

  useEffect(() => {
    if (!sync) {
      return;
    }

    const stored = storage.get(TAB_STORAGE_KEY);
    if (stored) {
      select(stored, false);
    }

    const onTab = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; group: string }>).detail;

      if (detail.group !== group) {
        select(detail.id, false);
      }
    };

    window.addEventListener(TAB_EVENT, onTab);

    return () => window.removeEventListener(TAB_EVENT, onTab);
  }, [group, select, sync]);

  return { selected, select };
}

export type TabListProps = {
  group: string;
  tabs: Array<{ id: string; label: string; className?: string }>;
  sync?: boolean;
  className?: string;
  tabClassName?: string;
  label?: string;
};

function TabListImpl({
  group,
  tabs,
  sync = true,
  className,
  tabClassName,
  label = "Code examples",
}: TabListProps) {
  const { selected, select } = useTabs(
    group,
    tabs.map((tab) => tab.id),
    sync,
  );

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) {
      return;
    }

    event.preventDefault();

    const next = tabs[(index + delta + tabs.length) % tabs.length]!;

    select(next.id);

    (
      event.currentTarget.parentElement?.children[tabs.indexOf(next)] as HTMLElement | undefined
    )?.focus();
  };

  return (
    <div role="tablist" aria-label={label} data-yd="tab-list" className={className}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={tabElementIds(group, tab.id).tab}
          aria-selected={selected === tab.id}
          aria-controls={tabElementIds(group, tab.id).panel}
          tabIndex={selected === tab.id ? 0 : -1}
          data-state={selected === tab.id ? "active" : "inactive"}
          className={[tabClassName, tab.className].filter(Boolean).join(" ") || undefined}
          onClick={() => select(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Accessible tab list controlling server-rendered panels (see {@link useTabs}). */
export const TabList = createIsland("yd:tab-list", TabListImpl);
