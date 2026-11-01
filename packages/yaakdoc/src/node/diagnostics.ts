import { consola } from "consola";
import type { Context } from "./context";

/** Logs every diagnostic as a warning: the dev server keeps serving the docs. */
export function warnDiagnostics(context: Context) {
  for (const diagnostic of context.diagnostics) {
    consola.warn(diagnostic.message);
  }
}

/** Logs the warnings and fails when there are errors, before anything is written. */
export function assertNoDiagnosticErrors(context: Context) {
  const errors = context.diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  for (const diagnostic of context.diagnostics) {
    if (diagnostic.severity === "warning") {
      consola.warn(diagnostic.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `The export has ${errors.length === 1 ? "an error" : `${errors.length} errors`}:\n` +
        errors.map((error) => `- ${error.message}`).join("\n"),
    );
  }
}
