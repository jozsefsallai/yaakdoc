import { spawn } from "node:child_process";

/** Opens a URL in the default browser (best effort). */
export default function openBrowser(url: string) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];

  try {
    spawn(command, args as string[], { stdio: "ignore", detached: true })
      .on("error", () => {})
      .unref();
  } catch {
    // ignore
  }
}
