/**
 * Helpers for framework integrations that run the engine in a separate process (e.g.
 * `@yaakdoc/next`, whose config is loaded in several processes). This entry doesn't load Vite or the
 * engine itself.
 */
import { fork } from "node:child_process";
import type { MountOptions } from "./node/mount";

export {
  DEFAULT_MOUNT_PATH,
  type MountOptions,
  mountBase,
  mountOptions,
} from "./node/mount";

export type WorkerRequest =
  | { command: "dev"; options: MountOptions }
  | { command: "build"; options: MountOptions };

export type WorkerResponse =
  | { type: "ready"; url: string }
  | { type: "done"; outDir: string }
  | { type: "error"; message: string };

export type DocsWorker = {
  /** URL of the docs dev server, including the mount path. */
  url: string;
  close: () => void;
};

const WORKER = new URL("./worker.js", import.meta.url);

/** Starts the docs dev server in a child process. It stops when this process exits. */
export async function startDevWorker(options: MountOptions): Promise<DocsWorker> {
  const { child, response } = runWorker({ command: "dev", options });

  const message = await response.catch((error: Error) => {
    child.kill();
    throw error;
  });

  if (message.type !== "ready") {
    child.kill();
    throw new Error("The yaakdoc worker didn't start a dev server.");
  }

  child.unref();
  child.channel?.unref();

  return { url: message.url, close: () => child.kill() };
}

/** Builds the docs in a child process. Resolves with the output directory. */
export async function runBuildWorker(options: MountOptions): Promise<string> {
  const { child, response } = runWorker({ command: "build", options });

  try {
    const message = await response;

    if (message.type !== "done") {
      throw new Error("The yaakdoc worker didn't build the docs.");
    }

    return message.outDir;
  } finally {
    child.kill();
  }
}

function runWorker(request: WorkerRequest) {
  const child = fork(WORKER, [], {
    cwd: request.options.cwd ?? process.cwd(),
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });

  const response = new Promise<WorkerResponse>((resolve, reject) => {
    child.once("message", (message: WorkerResponse) =>
      message.type === "error" ? reject(new Error(message.message)) : resolve(message),
    );

    child.once("error", reject);

    child.once("exit", (code) =>
      reject(new Error(`The yaakdoc worker exited unexpectedly (code ${code}).`)),
    );
  });

  child.send(request);

  return { child, response };
}
