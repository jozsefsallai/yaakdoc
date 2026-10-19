import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

export const CONTENT_TYPES: Record<string, string> = {
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
};

/** Interface to listen on: a given host, all interfaces (`true`), or localhost. */
export const listenHostname = (host: string | boolean) =>
  typeof host === "string" ? host : host ? "0.0.0.0" : "localhost";

/** URL to print/open for a server (all-interfaces hosts are shown as localhost). */
export function serverUrl(host: string | boolean, port: number, base: string): string {
  const hostname = listenHostname(host);
  return `http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}${base}`;
}

/** Listens on `port`, trying the next ports when it is taken. */
export function listen(server: Server, port: number, host: string | boolean): Promise<number> {
  const hostname = listenHostname(host);

  return new Promise((resolvePort, reject) => {
    let attempt = 0;

    const tryListen = (candidate: number) => {
      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" && attempt++ < 20 && port !== 0) tryListen(candidate + 1);
        else reject(error);
      });

      server.listen(candidate, hostname, () => resolvePort((server.address() as AddressInfo).port));
    };

    tryListen(port);
  });
}
