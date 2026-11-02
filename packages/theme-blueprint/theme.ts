import { defineTheme } from "@yaakdoc/react/theme";
import { z } from "zod";

export const blueprintOptions = z.object({
  /** Draw the drafting grid behind the content. */
  grid: z.boolean().default(true),
  /** Sidebar width (any CSS length). */
  sidebarWidth: z.string().default("18rem"),
  /** Folder levels expanded in the navigation by default (folders containing the current page always are). */
  navOpenDepth: z.number().int().min(0).default(2),
});

export type BlueprintOptions = z.output<typeof blueprintOptions>;

export default defineTheme({
  name: "blueprint",
  entry: "./src/entry.tsx",
  client: "./src/client.ts",
  styles: ["./src/fonts.css", "./src/styles.css"],
  preloadFonts: {
    sans: ["ibm-plex-sans-latin-wght-normal.woff2"],
    mono: ["ibm-plex-mono-latin-400-normal.woff2", "ibm-plex-mono-latin-500-normal.woff2"],
  },
  highlight: { light: "min-light", dark: "nord" },
  options: blueprintOptions,
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
      "@fontsource-variable/ibm-plex-sans",
      "@fontsource/ibm-plex-mono",
      "zod",
    ],
  },
});

/**
 * Fontsource declares its fonts with `font-display: swap`, which paints text in a fallback font
 * first and switches when IBM Plex arrives. With `optional` (and the preloads above), browsers wait
 * briefly for the fonts instead, and keep the fallback for that page if they're slow: no switch.
 * Runs after Vite's CSS plugin, on `src/fonts.css` with its imports inlined.
 */
function fontDisplay() {
  return {
    name: "blueprint:font-display",
    transform(code: string, id: string) {
      if (!/[\\/]src[\\/]fonts\.css(\?|$)/.test(id)) {
        return null;
      }

      return { code: code.replace(/font-display:\s*swap/g, "font-display: optional"), map: null };
    },
  };
}
