import Phaser from "phaser";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

export const GAME_FONT = "Beholden";

export const DEFAULT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: `"${GAME_FONT}", sans-serif`,
  fontStyle: "bold",
  color: "#ffffff",
};

export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { ...DEFAULT_TEXT_STYLE, ...style });
}

// Source PNGs are 43x51; keep the aspect ratio when scaling to match text size.
const ICON_SRC_W = 43;
const ICON_SRC_H = 51;

function parseFontSizePx(fontSize: unknown): number {
  if (typeof fontSize === "number") return fontSize;
  if (typeof fontSize === "string") {
    const m = fontSize.match(/([\d.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return 32;
}

// Central registry so callers only say "lit"/"unlit"; sizes auto-track the text
// size so icons sit on the same optical line as the letters around them.
export function signalIconImages(
  fontSize: number,
): Array<{ key: string; width: number; height: number; y: number }> {
  const h = Math.round(fontSize * 1.2);
  const w = Math.round(h * (ICON_SRC_W / ICON_SRC_H));
  // Nudge up so the icon's vertical midline aligns with the text cap line
  // rather than sitting on the descender.
  const yOffset = -Math.round(fontSize * 0.25);
  return [
    { key: "lit", width: w, height: h, y: yOffset },
    { key: "unlit", width: w, height: h, y: yOffset },
  ];
}

export function createBBCodeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): BBCodeText {
  const fontSize = parseFontSizePx(style.fontSize);
  const factory = (scene.add as unknown as {
    rexBBCodeText: (
      x: number,
      y: number,
      text: string,
      style: Record<string, unknown>,
    ) => BBCodeText;
  }).rexBBCodeText;
  return factory.call(scene.add, x, y, text, {
    ...DEFAULT_TEXT_STYLE,
    ...style,
    images: signalIconImages(fontSize),
  });
}

export async function loadGameFont(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  try {
    await fonts.load(`bold 16px "${GAME_FONT}"`);
  } catch {
    // Fall back silently; Phaser will use the fallback family.
  }
}
