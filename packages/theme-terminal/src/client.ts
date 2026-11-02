import { builtinIslands } from "@yaakdoc/react/islands";
import {
  CopyCode,
  CopyText,
  EnvironmentMenu,
  KeyboardShortcuts,
  MobileNavToggle,
  PageActions,
  RunInYaakButton,
  SearchButton,
  SearchCommand,
  ThemeToggle,
} from "@/components/islands";

/** Islands hydrated on the client: yaakdoc's built-ins plus Terminal's own. */
export default [
  ...builtinIslands,
  ThemeToggle,
  CopyCode,
  CopyText,
  PageActions,
  MobileNavToggle,
  EnvironmentMenu,
  RunInYaakButton,
  SearchButton,
  SearchCommand,
  KeyboardShortcuts,
];
