import Phaser from "phaser";
import { createText } from "./fonts";

const SANITY_HIGHLIGHT = 0x6f5fff;
const FUEL_HIGHLIGHT = 0xffb030;
const BLOCKED_HIGHLIGHT = 0x8a1a1a;
const HINT_FADE_PX = 30;
const HINT_FULL_PX = 140;

const CARD_HALF_WIDTH = 124;
const HINT_PAD = 30;
export const PANEL_TOP_TRANSPARENT = 44;

export class BottomPanel {
  private sanityText: Phaser.GameObjects.Text;
  private fuelText: Phaser.GameObjects.Text;
  private sanityHighlight: Phaser.GameObjects.Rectangle;
  private fuelHighlight: Phaser.GameObjects.Rectangle;
  private leftImpact: Phaser.GameObjects.Text;
  private rightImpact: Phaser.GameObjects.Text;
  private leftEffect: Phaser.GameObjects.Text;
  private rightEffect: Phaser.GameObjects.Text;
  private cardCenterX: number;

  constructor(
    scene: Phaser.Scene,
    panelTopY: number,
    panelWidth: number,
    panelHeight: number,
  ) {
    const halfW = panelWidth / 2;
    const cardCenterY = panelTopY + panelHeight / 2;
    this.cardCenterX = halfW;

    scene.add
      .image(0, panelTopY + panelHeight, "dark_light_bg")
      .setOrigin(0, 1);

    const highlightTop = panelTopY + PANEL_TOP_TRANSPARENT;
    const highlightHeight = panelHeight - PANEL_TOP_TRANSPARENT;
    this.sanityHighlight = scene.add
      .rectangle(0, highlightTop, halfW, highlightHeight, SANITY_HIGHLIGHT, 0)
      .setOrigin(0);
    this.fuelHighlight = scene.add
      .rectangle(halfW, highlightTop, halfW, highlightHeight, FUEL_HIGHLIGHT, 0)
      .setOrigin(0);

    createText(scene, halfW / 2, panelTopY + 60, "SANITY", {
      fontSize: "36px",
      color: "#b0a6ff",
    }).setOrigin(0.5);

    this.sanityText = createText(scene, halfW / 2, panelTopY + 120, "10", {
      fontSize: "96px",
      color: "#ffffff",
    }).setOrigin(0.5);

    createText(scene, halfW + halfW / 2, panelTopY + 60, "FUEL", {
      fontSize: "36px",
      color: "#4a2a08",
    }).setOrigin(0.5);

    this.fuelText = createText(scene, halfW + halfW / 2, panelTopY + 120, "10", {
      fontSize: "96px",
      color: "#2a1a0a",
    }).setOrigin(0.5);

    createText(
      scene,
      halfW / 2,
      panelTopY + panelHeight - 50,
      "← turn off light",
      { fontSize: "26px", color: "#b0a6ff" },
    ).setOrigin(0.5);

    createText(
      scene,
      halfW + halfW / 2,
      panelTopY + panelHeight - 50,
      "burn fuel →",
      { fontSize: "26px", color: "#4a2a08" },
    ).setOrigin(0.5);

    // Impact hints sit just beside the card and follow it during drag.
    this.leftImpact = createText(scene, 0, cardCenterY + 40, "-1 Sanity", {
      fontSize: "32px",
      color: "#b0a6ff",
    })
      .setOrigin(1, 0.5)
      .setAlpha(0)
      .setDepth(10);

    this.rightImpact = createText(scene, 0, cardCenterY + 40, "-1 Fuel", {
      fontSize: "32px",
      color: "#4a2a08",
    })
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setDepth(10);

    this.leftEffect = createText(scene, 0, cardCenterY - 10, "", {
      fontSize: "48px",
      color: "#b0a6ff",
    })
      .setOrigin(1, 0.5)
      .setAlpha(0)
      .setDepth(10);

    this.rightEffect = createText(scene, 0, cardCenterY - 10, "", {
      fontSize: "48px",
      color: "#4a2a08",
    })
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setDepth(10);
  }

  setEffectHints(leftText: string, rightText: string): void {
    this.leftEffect.setText(leftText);
    this.rightEffect.setText(rightText);
  }

  setResources(sanity: number, fuel: number): void {
    this.sanityText.setText(`${sanity}`);
    this.fuelText.setText(`${fuel}`);
  }

  pulseFuel(scene: Phaser.Scene): void {
    scene.tweens.killTweensOf(this.fuelText);
    this.fuelText.setScale(1);
    scene.tweens.add({
      targets: this.fuelText,
      scale: 1.5,
      duration: 180,
      ease: "Cubic.Out",
      yoyo: true,
    });
  }

  fuelAnchor(): { x: number; y: number } {
    return { x: this.fuelText.x, y: this.fuelText.y };
  }

  setSwipeHint(dragOffset: number, fuelAvailable: boolean): void {
    const left = Math.max(0, -dragOffset);
    const right = Math.max(0, dragOffset);
    const leftAlpha = ramp(left);
    const rightAlpha = ramp(right);

    this.sanityHighlight.fillAlpha = leftAlpha * 0.45;
    this.leftImpact.setAlpha(leftAlpha);
    const leftX =
      this.cardCenterX - CARD_HALF_WIDTH - HINT_PAD + Math.min(0, dragOffset);
    this.leftImpact.x = leftX;
    this.leftEffect.x = leftX;
    this.leftEffect.setAlpha(this.leftEffect.text ? leftAlpha : 0);

    if (fuelAvailable) {
      this.fuelHighlight.fillColor = FUEL_HIGHLIGHT;
      this.fuelHighlight.fillAlpha = rightAlpha * 0.45;
      this.rightImpact.setText("-1 Fuel").setColor("#4a2a08");
      this.rightEffect.setColor("#4a2a08");
    } else {
      this.fuelHighlight.fillColor = BLOCKED_HIGHLIGHT;
      this.fuelHighlight.fillAlpha = rightAlpha * 0.55;
      this.rightImpact.setText("No fuel left!").setColor("#ff5252");
      this.rightEffect.setColor("#ff5252");
    }
    this.rightImpact.setAlpha(rightAlpha);
    const rightX =
      this.cardCenterX + CARD_HALF_WIDTH + HINT_PAD + Math.max(0, dragOffset);
    this.rightImpact.x = rightX;
    this.rightEffect.x = rightX;
    this.rightEffect.setAlpha(fuelAvailable && this.rightEffect.text ? rightAlpha : 0);
  }
}

function ramp(distance: number): number {
  if (distance <= HINT_FADE_PX) return 0;
  return Math.min(1, (distance - HINT_FADE_PX) / (HINT_FULL_PX - HINT_FADE_PX));
}
