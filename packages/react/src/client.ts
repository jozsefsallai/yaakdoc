import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import type { IslandComponent } from "./island";

/**
 * Hydrates every `<yd-island>` on the page whose name matches one of the given islands.
 * Call this once from the theme's client entry.
 */
export function hydrateIslands(
  // biome-ignore lint/suspicious/noExplicitAny: islands have heterogeneous props
  islands: ReadonlyArray<IslandComponent<any>>,
  root: ParentNode = document,
) {
  const registry = new Map(islands.map((island) => [island.islandName, island.Component]));

  for (const element of root.querySelectorAll<HTMLElement>("yd-island[data-island]")) {
    if (element.dataset.hydrated) {
      continue;
    }

    const Component = registry.get(element.dataset.island ?? "");
    if (!Component) {
      continue;
    }

    let props: object = {};

    try {
      props = JSON.parse(element.dataset.props ?? "{}");
    } catch (error) {
      console.error(`[yaakdoc] Invalid props for island "${element.dataset.island}"`, error);
      continue;
    }

    element.dataset.hydrated = "true";

    hydrateRoot(element, createElement(Component, props), {
      ...(element.dataset.prefix ? { identifierPrefix: element.dataset.prefix } : {}),
    });
  }
}

export type { IslandComponent } from "./island";
