import Phaser from "phaser";

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

export async function loadGameFont(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  try {
    await fonts.load(`bold 16px "${GAME_FONT}"`);
  } catch {
    // Fall back silently; Phaser will use the fallback family.
  }
}
