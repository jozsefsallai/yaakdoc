import { spawn, spawnSync } from "node:child_process";
import { delimiter } from "node:path";

const isWindows = process.platform === "win32";

/** Splits a command setting like `npx -y yaakdoc` into words, honoring single and double quotes. */
export function splitCommand(command: string): string[] {
  const words: string[] = [];

  let word = "";
  let quote: string | null = null;
  let started = false;

  for (const char of command) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        word += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) {
        words.push(word);
        word = "";
        started = false;
      }
    } else {
      word += char;
      started = true;
    }
  }

  if (started) {
    words.push(word);
  }

  return words;
}

let shellPath: string | null | undefined;

/**
 * Apps launched from a desktop environment (macOS especially) get a minimal PATH that misses Node
 * version managers and Homebrew. Ask the login shell for the user's PATH once and merge it in.
 */
function userPath(): string | undefined {
  if (shellPath === undefined) {
    shellPath = null;

    if (!isWindows) {
      try {
        const result = spawnSync(process.env.SHELL || "/bin/sh", ["-lc", 'printf %s "$PATH"'], {
          encoding: "utf8",
          timeout: 5000,
        });

        shellPath = result.status === 0 && result.stdout ? result.stdout : null;
      } catch {
        // Keep the inherited PATH.
      }
    }
  }

  const entries = [
    ...(process.env.PATH ?? "").split(delimiter),
    ...(shellPath ?? "").split(delimiter),
  ];

  return [...new Set(entries.filter(Boolean))].join(delimiter) || undefined;
}

/** cmd.exe joins the arguments as they are, so quote the ones that need it. */
const quoteWindows = (arg: string) =>
  /[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg;

// biome-ignore lint/suspicious/noControlCharactersInRegex: matches ANSI escape codes.
export const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

export type RunResult = { ok: boolean; output: string };

export type RunOptions = {
  /** Kills the command when aborted. */
  signal?: AbortSignal;
  /** Called with the output so far whenever the command prints something. */
  onOutput?: (output: string) => void;
};

/** Runs `command` (a command setting, possibly with its own arguments) and captures its output. */
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  { signal, onOutput }: RunOptions = {},
): Promise<RunResult> {
  const [bin, ...prefix] = splitCommand(command);

  if (!bin) {
    return Promise.resolve({ ok: false, output: "No command configured." });
  }

  const argv = [...prefix, ...args];

  return new Promise((resolve) => {
    let output = "";

    const child = spawn(
      isWindows ? quoteWindows(bin) : bin,
      isWindows ? argv.map(quoteWindows) : argv,
      {
        cwd,
        signal,
        shell: isWindows,
        windowsHide: true,
        env: { ...process.env, PATH: userPath(), FORCE_COLOR: "0", NO_COLOR: "1", CI: "1" },
      },
    );

    const append = (chunk: Buffer) => {
      output += chunk;
      onOutput?.(output);
    };

    child.stdout.on("data", append);
    child.stderr.on("data", append);

    child.on("error", (error) => {
      resolve({ ok: false, output: `${output}${error.message}\n` });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, output: stripAnsi(output) });
    });
  });
}
