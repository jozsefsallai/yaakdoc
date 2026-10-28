import type { Context } from "@yaakapp/api";
import { describe, expect, it, vi } from "vitest";
import { ProgressDialog } from "../src/progress";

type Form = Parameters<Context["prompt"]["form"]>[0];

/**
 * A fake Yaak context. Forms stay open until `answer` closes the one on screen; like in Yaak, a
 * form shown with the same id replaces the open one, which then never resolves.
 */
function fakeContext() {
  const forms: { form: Form; resolve: (values: Record<string, string> | null) => void }[] = [];

  const ctx = {
    prompt: {
      form: vi.fn(
        (form: Form) =>
          new Promise((resolve) => {
            forms.push({ form, resolve });
          }),
      ),
    },
    toast: { show: vi.fn(async () => {}) },
    window: { openExternalUrl: vi.fn(async () => {}) },
  };

  const shown = () => forms.at(-1)!.form;
  const content = () => (shown().inputs[0] as { content: string }).content;
  const answer = async (values: Record<string, string> | null) => {
    forms.at(-1)!.resolve(values);
    await new Promise((resolve) => setTimeout(resolve));
  };

  return { ctx: ctx as unknown as Context, raw: ctx, forms, shown, content, answer };
}

const dialog = (ctx: Context) =>
  new ProgressDialog(ctx, {
    id: "yaakdoc-build",
    title: "Build docs",
    action: "Build docs with yaakdoc...",
    description: "Acme",
  });

describe("ProgressDialog", () => {
  it("shows every step and form in the same dialog", async () => {
    const { ctx, forms, shown, content } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Exporting the workspace", "Exported the workspace");
    expect(content()).toBe("- ⏳ **Exporting the workspace…**");

    void progress.form({ confirmText: "Build", inputs: [] });
    progress.step("Building the docs");

    expect(content()).toBe("- ✓ Exported the workspace\n- ⏳ **Building the docs…**");
    expect(new Set(forms.map(({ form }) => form.id)).size).toBe(1);
    expect(shown()).toMatchObject({ title: "Build docs", description: "Acme" });
  });

  it("shows the end of a command's output", async () => {
    vi.useFakeTimers();

    try {
      const { ctx, content } = fakeContext();
      const progress = dialog(ctx);

      progress.step("Installing yaakdoc-theme-winxp@0.1.0");
      progress.output(Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n"));
      progress.output(
        `${Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n")}\n\x1b[32mdone\x1b[0m\n`,
      );

      expect(content()).not.toContain("line");
      vi.advanceTimersByTime(1000);

      expect(content()).toBe(
        [
          "- ⏳ **Installing yaakdoc-theme-winxp@0.1.0…**",
          "",
          "~~~text",
          ...Array.from({ length: 7 }, (_, i) => `line ${i + 6}`),
          "done",
          "~~~",
        ].join("\n"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels when the user cancels a step", async () => {
    const { ctx, answer } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Exporting the workspace");
    await answer(null);

    expect(progress.signal.aborted).toBe(true);
  });

  it("doesn't cancel when the user cancels a form", async () => {
    const { ctx, answer } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Exporting the workspace");
    const values = progress.form({ inputs: [] });
    await answer(null);

    expect(await values).toBeNull();
    expect(progress.cancelled).toBe(false);
  });

  it("says how to come back when it goes to the background, and comes back", async () => {
    const { ctx, raw, forms, content, answer } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Building the docs");
    await answer({});

    expect(raw.toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Running in the background. Choose "Build docs with yaakdoc..." again to see its progress.',
      }),
    );

    progress.step("Installing the theme");
    expect(forms).toHaveLength(1);

    progress.show();
    expect(progress.background).toBe(false);
    expect(forms).toHaveLength(2);
    expect(forms[1]!.form.id).toBe(forms[0]!.form.id);
    expect(content()).toBe("- ✓ Building the docs\n- ⏳ **Installing the theme…**");
  });

  it("reports with a toast when it runs in the background", async () => {
    const { ctx, raw, forms, answer } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Building the docs");
    await answer({});
    expect(progress.background).toBe(true);

    progress.step("Still building");
    expect(forms).toHaveLength(1);

    await progress.succeed("Built the docs.", { label: "Open folder", url: "file:///site" });
    expect(forms).toHaveLength(1);
    expect(raw.toast.show).toHaveBeenCalledWith(expect.objectContaining({ color: "success" }));
    expect(raw.window.openExternalUrl).toHaveBeenCalledWith("file:///site");
  });

  it("shows the result and opens the folder on request", async () => {
    const { ctx, raw, content, answer } = fakeContext();
    const progress = dialog(ctx);

    progress.step("Building the docs", "Built the docs");
    const done = progress.succeed("Built 3 pages.", { label: "Open folder", url: "file:///site" });

    expect(content()).toBe("- ✓ Built the docs\n\nBuilt 3 pages.");
    await answer({});
    await done;

    expect(raw.window.openExternalUrl).toHaveBeenCalledWith("file:///site");
  });
});
