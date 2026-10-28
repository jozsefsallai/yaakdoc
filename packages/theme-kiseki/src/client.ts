import { builtinIslands } from "@yaakdoc/react/islands";
import {
  CopyCode,
  CopyText,
  EnvironmentMenu,
  MobileNavToggle,
  PageActions,
  RunInYaakButton,
  SearchButton,
  SearchCommand,
  ThemeToggle,
} from "@/components/islands";

/** Islands hydrated on the client: yaakdoc's built-ins plus Kiseki's own. */
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
];
