/** Child process started by `yaakdoc/integration`: runs the dev server or a build on request. */
import type { WorkerRequest, WorkerResponse } from "./integration";
import { build } from "./node/build";
import { createDevServer } from "./node/dev";
import { mountOptions } from "./node/mount";
import { freePort } from "./node/server";

const reply = (message: WorkerResponse) => process.send?.(message);

process.once("message", async (request: WorkerRequest) => {
  try {
    const options = mountOptions(request.options);

    if (request.command === "dev") {
      // The browser reaches the docs through the host app's proxy, which doesn't forward
      // WebSockets, so HMR connects to this server directly.
      const port = await freePort();

      const server = await createDevServer({
        ...options,
        port,
        hmrClientPort: port,
        host: "localhost",
        open: false,
      });

      reply({ type: "ready", url: server.url });
    } else {
      const { outDir } = await build(options);
      reply({ type: "done", outDir });
    }
  } catch (error) {
    reply({ type: "error", message: (error as Error).stack ?? String(error) });
  }
});

// Exit together with the process that started us.
process.on("disconnect", () => process.exit(0));
