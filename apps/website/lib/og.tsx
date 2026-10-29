import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

export async function ogImage({ title, description }: { title: string; description?: string }) {
  const icon = await readFile(join(process.cwd(), "public/icon.svg"));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "72px 80px",
        background: "#1d1b2c",
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(185, 26, 183, 0.14), transparent 45%), radial-gradient(circle at 0% 100%, rgba(75, 195, 140, 0.1), transparent 45%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* biome-ignore lint/performance/noImgElement: rendered by Satori, not the browser */}
        <img src={iconSrc} width={88} height={88} alt="" />

        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>
          <span style={{ color: "#ecce55" }}>yaak</span>
          <span style={{ color: "#01df70" }}>doc</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 20 }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>
          {title}
        </div>

        {description ? (
          <div style={{ fontSize: 32, color: "#c9c6dd", lineHeight: 1.35 }}>{description}</div>
        ) : null}
      </div>
    </div>,
    size,
  );
}
