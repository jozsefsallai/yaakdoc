import {
  type ComponentType,
  createContext,
  createElement,
  type JSX,
  type ReactElement,
  use,
} from "react";

export type IslandRenderer = {
  render: (element: ReactElement, identifierPrefix: string) => string;
  next: () => string;
};

/**
 * Provided by the server renderer. Islands are rendered as isolated roots (exactly like they are
 * hydrated on the client), so `useId()` and friends produce matching ids.
 * @internal
 */
export const IslandRendererContext = createContext<IslandRenderer | null>(null);

export type IslandComponent<P extends object> = ComponentType<P> & {
  /** Unique island name, used to find the component when hydrating. */
  islandName: string;
  /** The underlying component (rendered inside the island element). */
  Component: ComponentType<P>;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "yd-island": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-island"?: string;
        "data-props"?: string;
        "data-prefix"?: string;
      };
    }
  }
}

/**
 * Turns a component into an island: it is rendered to HTML on the server like any other component,
 * and hydrated on the client (only this component, not the whole page).
 *
 * Islands are hydrated in isolation: their props must be JSON-serializable and they cannot use
 * yaakdoc context hooks. Register islands on the client with `hydrateIslands()`.
 */
export function createIsland<P extends object>(
  name: string,
  Component: ComponentType<P>,
): IslandComponent<P> {
  function Island(props: P): JSX.Element {
    const renderer = use(IslandRendererContext);

    const common = {
      "data-island": name,
      "data-props": JSON.stringify(props),
      style: { display: "contents" },
    };

    if (renderer) {
      const prefix = renderer.next();

      return (
        <yd-island
          {...common}
          data-prefix={prefix}
          dangerouslySetInnerHTML={{
            __html: renderer.render(createElement(Component, props), prefix),
          }}
        />
      );
    }

    return (
      <yd-island {...common}>
        <Component {...props} />
      </yd-island>
    );
  }

  Island.displayName = `Island(${name})`;

  return Object.assign(Island, { islandName: name, Component });
}
