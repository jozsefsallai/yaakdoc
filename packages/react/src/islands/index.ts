import type { IslandComponent } from "../island";
import { ColorModeToggle } from "./color-mode";
import { CopyButton } from "./copy";
import { EnvironmentSwitcher } from "./environment";
import { OpenInLink } from "./llm";
import { NavFilter, NavToggle, ScrollSpy } from "./nav";
import { RunInYaakLink } from "./run-in-yaak";
import { SearchDialog, SearchTrigger } from "./search";
import { TabList } from "./tabs";

export { createIsland, type IslandComponent } from "../island";
export type { ColorMode, ColorModePreference, EnvironmentOption, LlmProvider } from "../types";
export { resolveUrl, storage } from "./browser";
export {
  applyColorMode,
  COLOR_MODE_STORAGE_KEY,
  ColorModeToggle,
  type ColorModeToggleProps,
  colorModeScript,
  useColorMode,
} from "./color-mode";
export { CopyButton, type CopyButtonProps, type CopySource, useCopy } from "./copy";
export {
  applyEnvironment,
  ENVIRONMENT_STORAGE_KEY,
  EnvironmentSwitcher,
  type EnvironmentSwitcherProps,
  environmentCss,
  environmentScript,
  useEnvironment,
} from "./environment";
export { LLM_PROVIDERS, llmPrompt, OpenInLink, type OpenInLinkProps, openInUrl } from "./llm";
export {
  filterNav,
  NavFilter,
  type NavFilterProps,
  NavToggle,
  type NavToggleProps,
  ScrollSpy,
  useNavToggle,
  useScrollSpy,
} from "./nav";
export {
  RUN_IN_YAAK_BADGE,
  RunInYaakLink,
  type RunInYaakLinkProps,
  runInYaakUrl,
  useRunInYaakHref,
} from "./run-in-yaak";
export {
  openSearch,
  platformCss,
  platformScript,
  SearchDialog,
  type SearchDialogProps,
  type SearchEntry,
  SearchShortcut,
  SearchTrigger,
  type SearchTriggerProps,
  searchEntries,
  useSearch,
  useSearchDialog,
  useSearchShortcutLabel,
} from "./search";
export {
  TAB_STORAGE_KEY,
  TabList,
  type TabListProps,
  tabElementIds,
  tabGroupIds,
  tabPanelProps,
  useTabs,
  visibleTabPanelSelector,
} from "./tabs";

/** All built-in islands. Pass to `hydrateIslands()` (alongside your own) in a theme's client entry. */
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous props
export const builtinIslands: ReadonlyArray<IslandComponent<any>> = [
  ColorModeToggle,
  CopyButton,
  EnvironmentSwitcher,
  TabList,
  NavToggle,
  NavFilter,
  ScrollSpy,
  OpenInLink,
  RunInYaakLink,
  SearchTrigger,
  SearchDialog,
];
