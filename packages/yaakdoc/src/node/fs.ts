import { writeFile } from "node:fs/promises";

/** Writes pretty-printed JSON with a trailing newline (like editors and formatters do). */
export function writeJson(file: string, value: unknown): Promise<void> {
  return writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
