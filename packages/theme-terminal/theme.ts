import { defineTheme } from "@yaakdoc/react/theme";
import { z } from "zod";

export const terminalOptions = z.object({
  /** Phosphor color for prompts, links and highlights (branding colors take precedence). */
  palette: z.enum(["green", "amber", "mono"]).default("green"),
  /** Show a blinking cursor after the prompt in the top bar. */
  cursor: z.boolean().default(true),
  /** Sidebar width (any CSS length). */
  sidebarWidth: z.string().default("19rem"),
  /** Folder levels expanded in the navigation by default (folders containing the current page always are). */
  navOpenDepth: z.number().int().min(0).default(2),
});

export type TerminalOptions = z.output<typeof terminalOptions>;

export default defineTheme({
  name: "terminal",
  entry: "./src/entry.tsx",
  client: "./src/client.ts",
  styles: ["./src/fonts.css", "./src/styles.css"],
  preloadFonts: {
    mono: ["jetbrains-mono-latin-wght-normal.woff2"],
  },
  highlight: { light: "vitesse-light", dark: "vitesse-black" },
  options: terminalOptions,
  vitePlugins: async () => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return [tailwindcss(), fontDisplay()];
  },
  eject: {
    files: ["theme.ts", "src/**", "components.json", "tsconfig.json", "README.md"],
    dependencies: [
      "@yaakdoc/react",
      "tailwindcss",
      "@tailwindcss/vite",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-slot",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@fontsource-variable/jetbrains-mono",
      "zod",
    ],
  },
});

/**
 * Fontsource declares its fonts with `font-display: swap`, which paints text in a fallback font
 * first and switches when JetBrains Mono arrives. With `optional` (and the preload above), browsers
 * wait briefly for the font instead, and keep the fallback for that page if it's slow: no switch.
 * Runs after Vite's CSS plugin, on `src/fonts.css` with its imports inlined.
 */
function fontDisplay() {
  return {
    name: "terminal:font-display",
    transform(code: string, id: string) {
      if (!/[\\/]src[\\/]fonts\.css(\?|$)/.test(id)) {
        return null;
      }

      return { code: code.replace(/font-display:\s*swap/g, "font-display: optional"), map: null };
    },
  };
}
