import { posix, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { isInside } from "../src/node/plugin";

describe("isInside", () => {
  it("matches files inside the directory", () => {
    expect(isInside("/themes/winxp", "/themes/winxp/src/client.ts", posix)).toBe(true);
    expect(isInside("/themes/winxp", "/themes/winxp/src/client.ts?v=1", posix)).toBe(true);
    expect(isInside("/themes/winxp", "/themes/winxp-other/src/client.ts", posix)).toBe(false);
    expect(isInside("/themes/winxp", "/themes/winxp", posix)).toBe(false);
    expect(isInside("/themes/winxp", "\0virtual:yaakdoc/entry-client", posix)).toBe(false);
  });

  it("matches Vite's forward-slash ids against Windows paths", () => {
    const root = "C:\\Users\\Joe\\AppData\\Local\\Temp\\yaakdoc\\themes\\winxp";
    const id = "C:/Users/Joe/AppData/Local/Temp/yaakdoc/themes/winxp/src/client.ts";

    expect(isInside(root, id, win32)).toBe(true);
    expect(isInside(root, "D:/elsewhere/src/client.ts", win32)).toBe(false);
  });
});
