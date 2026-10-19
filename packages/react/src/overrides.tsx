import { type ComponentType, createContext, type ReactNode, use } from "react";
import type { ThemeComponents } from "./types";

const ComponentsContext = createContext<ThemeComponents>({});

/**
 * Provides component overrides. Every base component created with {@link overridable} renders the
 * override registered under its name instead, so themes can swap any piece (MDX-style) – including
 * pieces rendered internally by other base components.
 */
export function ComponentsProvider({
  components,
  children,
}: {
  components: ThemeComponents | undefined;
  children: ReactNode;
}) {
  const parent = use(ComponentsContext);
  return <ComponentsContext value={{ ...parent, ...components }}>{children}</ComponentsContext>;
}

export const useComponents = (): ThemeComponents => use(ComponentsContext);

/**
 * Wraps a default component so it can be replaced through {@link ComponentsProvider}.
 * The override receives the same props plus `Default`, the original implementation, so it can
 * decorate rather than replace.
 */
export function overridable<P extends object>(
  name: string,
  Default: ComponentType<P>,
): ComponentType<P> & { displayName: string; Default: ComponentType<P> } {
  function Overridable(props: P) {
    const Override = use(ComponentsContext)[name] as
      | ComponentType<P & { Default: ComponentType<P> }>
      | undefined;

    if (Override && Override !== Wrapped) {
      return <Override {...props} Default={Default} />;
    }

    return <Default {...props} />;
  }

  const Wrapped = Object.assign(Overridable, { displayName: name, Default });
  return Wrapped;
}
