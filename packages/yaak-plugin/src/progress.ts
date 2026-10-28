import type { Context } from "@yaakapp/api";
import { stripAnsi } from "./run";

type FormRequest = Parameters<Context["prompt"]["form"]>[0];

/** A form shown in the dialog. Its id is the dialog's, and the title defaults to the dialog's. */
export type DialogForm = Omit<FormRequest, "id" | "title"> & { title?: string };

/** How many lines of a command's output are shown under its step. */
const OUTPUT_LINES = 8;
/** Command output updates the dialog at most this often (ms). */
const OUTPUT_INTERVAL = 1000;

/**
 * One dialog for a whole action: its progress, its forms and its result. Yaak's plugin API can't
 * update or close a form, but a form shown with the id of an open dialog replaces it. So every
 * update shows a new form with the same id, and the dialog stays open until the action is done.
 *
 * While a step runs, the dialog offers **Run in background** (later steps report with toasts
 * instead; `show` brings the dialog back) and **Cancel**, which aborts `signal`.
 */
export class ProgressDialog {
  readonly #ctx: Context;
  readonly #id: string;
  readonly #title: string;
  readonly #description: string | undefined;
  /** The menu item that started the action, named in the toast that says how to come back. */
  readonly #action: string;
  readonly #controller = new AbortController();

  #done: string[] = [];
  #step: { running: string; done: string } | null = null;
  #output = "";
  #outputTimer: ReturnType<typeof setTimeout> | undefined;
  /** Identifies the form on screen: replaced forms never resolve, but don't rely on it. */
  #shown = 0;
  #background = false;
  #cancelReported = false;

  constructor(
    ctx: Context,
    options: { id: string; title: string; action: string; description?: string },
  ) {
    this.#ctx = ctx;
    this.#id = `${options.id}-${Date.now()}`;
    this.#title = options.title;
    this.#action = options.action;
    this.#description = options.description;
  }

  /** Aborted when the user cancels. Pass it to the commands the action runs. */
  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  get cancelled(): boolean {
    return this.#controller.signal.aborted;
  }

  /** Whether the user sent the action to the background, so results go to toasts. */
  get background(): boolean {
    return this.#background;
  }

  /** Brings the dialog back from the background, showing the step that's running. */
  show() {
    this.#background = false;
    this.#render();
  }

  /** Shows a form in the dialog and waits for it. The dialog comes back from the background. */
  form(form: DialogForm) {
    this.#clearOutputTimer();
    this.#shown++;
    this.#background = false;

    return this.#ctx.prompt.form({
      title: this.#title,
      ...(this.#description ? { description: this.#description } : {}),
      size: "lg",
      ...form,
      id: this.#id,
    });
  }

  /**
   * Starts a step, completing the one before it (or, with `replace`, dropping it: e.g. when the
   * built-in build hands over to the yaakdoc CLI).
   */
  step(running: string, done = running, { replace = false } = {}) {
    this.complete(replace ? null : undefined);
    this.#step = { running, done };
    this.#render();
  }

  /**
   * Completes the current step, optionally with a label that says how it went. `null` drops the
   * step from the list instead.
   */
  complete(label?: string | null) {
    if (this.#step && label !== null) {
      this.#done.push(label ?? this.#step.done);
    }

    this.#step = null;

    this.#output = "";
    this.#clearOutputTimer();
  }

  /** Shows the end of a command's output (all of it so far) under the current step. */
  readonly output = (output: string) => {
    this.#output = output;
    this.#outputTimer ??= setTimeout(() => {
      this.#outputTimer = undefined;
      this.#render();
    }, OUTPUT_INTERVAL);
  };

  /** The steps so far, as Markdown. */
  summary(): string {
    return this.#done.map((label) => `- ✓ ${label}`).join("\n");
  }

  /**
   * Completes the action. Shows `message` with a button that opens `url`, or, when the action runs
   * in the background, a toast while `url` is opened.
   */
  async succeed(message: string, open: { label: string; url: string }) {
    this.complete();

    if (this.#background) {
      await this.#ctx.toast.show({ message, color: "success", icon: "check_circle" });
      await this.#ctx.window.openExternalUrl(open.url);
      return;
    }

    const values = await this.form({
      inputs: [{ type: "markdown", content: [this.summary(), "", message].join("\n") }],
      confirmText: open.label,
      cancelText: "Close",
    });

    if (values) {
      await this.#ctx.window.openExternalUrl(open.url);
    }
  }

  /** Shows an error, with a log if there is one. Brings the dialog back from the background. */
  async fail(title: string, message: string, log?: string) {
    this.#step = null;

    await this.form({
      title,
      confirmText: "Close",
      inputs: [
        { type: "markdown", content: [this.summary(), "", message].join("\n") },
        ...(log
          ? [
              {
                type: "editor" as const,
                name: "log",
                label: "Output",
                language: "text" as const,
                readOnly: true,
                optional: true,
                rows: 20,
                defaultValue: log.split("\n").slice(-200).join("\n"),
              },
            ]
          : []),
      ],
    });
  }

  /** Says the action was cancelled (the dialog closed when the user cancelled). Says it once. */
  async cancel(message = "yaakdoc: cancelled") {
    this.#clearOutputTimer();

    if (!this.#cancelReported) {
      this.#cancelReported = true;
      await this.#ctx.toast.show({ message, color: "notice", timeout: 8000 });
    }
  }

  #clearOutputTimer() {
    clearTimeout(this.#outputTimer);
    this.#outputTimer = undefined;
  }

  #render() {
    if (this.#background || this.cancelled || !this.#step) {
      return;
    }

    const tail = stripAnsi(this.#output)
      .split(/\r?\n|\r/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .slice(-OUTPUT_LINES);

    const steps = [this.summary(), `- ⏳ **${this.#step.running}…**`].filter(Boolean).join("\n");
    const content = tail.length ? `${steps}\n\n~~~text\n${tail.join("\n")}\n~~~` : steps;

    const shown = ++this.#shown;

    this.#ctx.prompt
      .form({
        id: this.#id,
        title: this.#title,
        ...(this.#description ? { description: this.#description } : {}),
        size: "lg",
        confirmText: "Run in background",
        cancelText: "Cancel",
        inputs: [{ type: "markdown", content }],
      })
      .then(
        (values) => {
          if (shown !== this.#shown) {
            return;
          }

          if (values) {
            this.#background = true;

            void this.#ctx.toast.show({
              message: `Running in the background. Choose "${this.#action}" again to see its progress.`,
              color: "info",
              timeout: 8000,
            });
          } else {
            this.#controller.abort();
          }
        },
        (error) => console.error("yaakdoc: couldn't show progress", error),
      );
  }
}
