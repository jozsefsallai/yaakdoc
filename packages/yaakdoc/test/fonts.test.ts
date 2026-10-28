import { describe, expect, it } from "vitest";
import { cssUrls, findFontPreloads } from "../src/node/fonts";

describe("findFontPreloads", () => {
  const fonts = { sans: ["geist-latin.woff2"], mono: ["geist-mono-latin.woff2", "missing.woff2"] };

  it("matches built files with a content hash", () => {
    expect(
      findFontPreloads(
        [
          "_yaakdoc/geist-latin-ext-AbCd12_-.woff2",
          "_yaakdoc/geist-latin-AbCd12_-.woff2",
          "_yaakdoc/geist-mono-latin-Zz9-Zz9-.woff2",
        ],
        fonts,
      ),
    ).toEqual([
      { href: "_yaakdoc/geist-latin-AbCd12_-.woff2", role: "sans" },
      { href: "_yaakdoc/geist-mono-latin-Zz9-Zz9-.woff2", role: "mono" },
    ]);
  });

  it("matches URLs in the dev server's CSS", () => {
    const css = `@font-face{src:url("/@fs/x/files/geist-latin.woff2?v=1") format("woff2")}
      @font-face{src:url(/@fs/x/files/geist-latin-ext.woff2)}`;

    expect(findFontPreloads(cssUrls([css]), fonts)).toEqual([
      { href: "/@fs/x/files/geist-latin.woff2?v=1", role: "sans" },
    ]);
  });
});
