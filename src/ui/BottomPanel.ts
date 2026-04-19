import Phaser from "phaser";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { LightState, SIGNAL_SEQUENCE_LENGTH } from "../game/Signal";
import { createBBCodeText, createText } from "./fonts";

const SANITY_HIGHLIGHT = 0x6f5fff;
const FUEL_HIGHLIGHT = 0xffb030;
const BLOCKED_HIGHLIGHT = 0x8a1a1a;
const HINT_FADE_PX = 30;
const HINT_FULL_PX = 140;

const CARD_HALF_WIDTH = 124;
const HINT_PAD = 30;
export const PANEL_TOP_TRANSPARENT = 44;

// Matches SignalListView's CURRENT-signal dot styling so the player reads the
// same visual language across both surfaces.
const DOT_RADIUS = 6;
const DOT_SPACING = 18;
const DOT_ON_COLOR = 0xffd27a;
const DOT_OFF_COLOR = 0x444455;
const DOT_EMPTY_COLOR = 0x2a2a3a;

// Bottom panel renders above the SignalListView paper (depths 4/5) so the
// paper never peeks into the bottom half of the screen. Card-follow hints keep
// their higher depth so they read above the panel body.
const PANEL_BASE_DEPTH = 6;
const PANEL_HINT_DEPTH = 10;

export class BottomPanel {
  private scene: Phaser.Scene;
  private sanityText: Phaser.GameObjects.Text;
  private fuelText: Phaser.GameObjects.Text;
  private sanityHighlight: Phaser.GameObjects.Rectangle;
  private fuelHighlight: Phaser.GameObjects.Rectangle;
  private leftImpact: Phaser.GameObjects.Text;
  private rightImpact: Phaser.GameObjects.Text;
  private leftEffect: BBCodeText;
  private rightEffect: BBCodeText;
  private leftReward: Phaser.GameObjects.Text;
  private rightReward: Phaser.GameObjects.Text;
  private cardCenterX: number;
  private prevSanity = 0;
  private prevFuel = 0;
  private initialized = false;
  private costVisible = true;
  private leftSignalDots: Phaser.GameObjects.Arc[] = [];
  private rightSignalDots: Phaser.GameObjects.Arc[] = [];
  private signalVisible = false;

  constructor(
    scene: Phaser.Scene,
    panelTopY: number,
    panelWidth: number,
    panelHeight: number,
  ) {
    this.scene = scene;
    const halfW = panelWidth / 2;
    const cardCenterY = panelTopY + panelHeight / 2;
    this.cardCenterX = halfW;

    scene.add
      .image(0, panelTopY + panelHeight, "dark_light_bg")
      .setOrigin(0, 1)
      .setDepth(PANEL_BASE_DEPTH);

    const highlightTop = panelTopY + PANEL_TOP_TRANSPARENT;
    const highlightHeight = panelHeight - PANEL_TOP_TRANSPARENT;
    this.sanityHighlight = scene.add
      .rectangle(0, highlightTop, halfW, highlightHeight, SANITY_HIGHLIGHT, 0)
      .setOrigin(0)
      .setDepth(PANEL_BASE_DEPTH);
    this.fuelHighlight = scene.add
      .rectangle(halfW, highlightTop, halfW, highlightHeight, FUEL_HIGHLIGHT, 0)
      .setOrigin(0)
      .setDepth(PANEL_BASE_DEPTH);

    createText(scene, halfW / 2, panelTopY + 60, "SANITY", {
      fontSize: "36px",
      color: "#b0a6ff",
    })
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    this.sanityText = createText(scene, halfW / 2, panelTopY + 120, "10", {
      fontSize: "96px",
      color: "#ffffff",
    })
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    createText(scene, halfW + halfW / 2, panelTopY + 60, "FUEL", {
      fontSize: "36px",
      color: "#4a2a08",
    })
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    this.fuelText = createText(scene, halfW + halfW / 2, panelTopY + 120, "10", {
      fontSize: "96px",
      color: "#2a1a0a",
    })
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    createText(
      scene,
      halfW / 2,
      panelTopY + panelHeight - 50,
      "← turn off light",
      { fontSize: "26px", color: "#b0a6ff" },
    )
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    createText(
      scene,
      halfW + halfW / 2,
      panelTopY + panelHeight - 50,
      "burn fuel →",
      { fontSize: "26px", color: "#4a2a08" },
    )
      .setOrigin(0.5)
      .setDepth(PANEL_BASE_DEPTH);

    // Impact hints sit just beside the card and follow it during drag.
    this.leftImpact = createText(scene, 0, cardCenterY + 40, "-1 Sanity", {
      fontSize: "32px",
      color: "#b0a6ff",
    })
      .setOrigin(1, 0.5)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    this.rightImpact = createText(scene, 0, cardCenterY + 40, "-1 Fuel", {
      fontSize: "32px",
      color: "#4a2a08",
    })
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    this.leftEffect = createBBCodeText(scene, 0, cardCenterY - 10, "", {
      fontSize: "48px",
      color: "#b0a6ff",
      align: "right",
    })
      .setOrigin(1, 0.5)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    this.rightEffect = createBBCodeText(scene, 0, cardCenterY - 10, "", {
      fontSize: "48px",
      color: "#4a2a08",
      align: "center",
    })
      .setOrigin(0, 0.5)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    this.leftReward = createText(scene, 0, cardCenterY + 90, "", {
      fontSize: "26px",
      color: "#b0a6ff",
      align: "right",
    })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    this.rightReward = createText(scene, 0, cardCenterY + 90, "", {
      fontSize: "26px",
      color: "#4a2a08",
      align: "left",
    })
      .setOrigin(0, 0)
      .setAlpha(0)
      .setDepth(PANEL_HINT_DEPTH);

    // Signal progress dots sit inline at the end of each effect hint, mirroring
    // SignalListView's CURRENT indicator so the visual language stays consistent.
    // Position is set each frame in setSwipeHint so the dots follow the card.
    const dotsY = cardCenterY - 10;
    for (let i = 0; i < SIGNAL_SEQUENCE_LENGTH; i++) {
      this.leftSignalDots.push(
        scene.add
          .circle(0, dotsY, DOT_RADIUS, DOT_EMPTY_COLOR)
          .setStrokeStyle(1, 0x101018)
          .setDepth(PANEL_HINT_DEPTH)
          .setAlpha(0),
      );
      this.rightSignalDots.push(
        scene.add
          .circle(0, dotsY, DOT_RADIUS, DOT_EMPTY_COLOR)
          .setStrokeStyle(1, 0x101018)
          .setDepth(PANEL_HINT_DEPTH)
          .setAlpha(0),
      );
    }
  }

  setSignalProgress(signal: readonly LightState[] | null): void {
    this.signalVisible = signal !== null;
    if (!signal) return;
    const applyState = (dot: Phaser.GameObjects.Arc, i: number) => {
      const state = signal[i];
      if (state === undefined) dot.fillColor = DOT_EMPTY_COLOR;
      else dot.fillColor = state === "on" ? DOT_ON_COLOR : DOT_OFF_COLOR;
    };
    this.leftSignalDots.forEach(applyState);
    this.rightSignalDots.forEach(applyState);
  }

  setEffectHints(leftText: string, rightText: string): void {
    this.leftEffect.setText(leftText);
    this.rightEffect.setText(rightText);
  }

  setRewardHints(leftReward: string, rightReward: string): void {
    this.leftReward.setText(leftReward);
    this.rightReward.setText(rightReward);
    // Paint negative values red so players immediately read a losing choice.
    this.leftReward.setColor(leftReward.startsWith("-") ? "#ff7070" : "#b0a6ff");
    this.rightReward.setColor(
      rightReward.startsWith("-") ? "#ff7070" : "#4a2a08",
    );
  }

  setCostVisible(visible: boolean): void {
    this.costVisible = visible;
  }

  setResources(sanity: number, fuel: number): void {
    const dSanity = this.initialized ? sanity - this.prevSanity : 0;
    const dFuel = this.initialized ? fuel - this.prevFuel : 0;
    this.sanityText.setText(`${sanity}`);
    this.fuelText.setText(`${fuel}`);
    if (dSanity !== 0) this.floatDelta(this.sanityText, dSanity, "sanity");
    if (dFuel !== 0) this.floatDelta(this.fuelText, dFuel, "fuel");
    this.prevSanity = sanity;
    this.prevFuel = fuel;
    this.initialized = true;
  }

  pulseFuel(scene: Phaser.Scene): void {
    this.pulse(scene, this.fuelText);
  }

  fuelAnchor(): { x: number; y: number } {
    return { x: this.fuelText.x, y: this.fuelText.y };
  }

  sanityAnchor(): { x: number; y: number } {
    return { x: this.sanityText.x, y: this.sanityText.y };
  }

  private floatDelta(
    target: Phaser.GameObjects.Text,
    delta: number,
    kind: "sanity" | "fuel",
  ): void {
    const isPositive = delta > 0;
    const label = isPositive ? `+${delta}` : `${delta}`;
    const color = isPositive
      ? kind === "sanity"
        ? "#d6c8ff"
        : "#fff6c0"
      : "#ff7070";
    const stroke = kind === "sanity" ? "#1a1240" : "#2a1a0a";
    const floater = createText(this.scene, target.x, target.y - 10, label, {
      fontSize: "96px",
      color,
      stroke,
      strokeThickness: 10,
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(210);
    this.scene.tweens.add({
      targets: floater,
      y: target.y - 220,
      alpha: { from: 1, to: 0 },
      scale: { from: 0.7, to: 1.5 },
      duration: 900,
      ease: "Cubic.Out",
      onComplete: () => floater.destroy(),
    });
    this.pulse(this.scene, target);
  }

  private pulse(scene: Phaser.Scene, target: Phaser.GameObjects.Text): void {
    scene.tweens.killTweensOf(target);
    target.setScale(1);
    scene.tweens.add({
      targets: target,
      scale: 1.5,
      duration: 180,
      ease: "Cubic.Out",
      yoyo: true,
    });
  }

  setSwipeHint(
    dragOffset: number,
    fuelAvailable: boolean,
    fuelCost: number,
  ): void {
    const left = Math.max(0, -dragOffset);
    const right = Math.max(0, dragOffset);
    const leftAlpha = ramp(left);
    const rightAlpha = ramp(right);

    this.sanityHighlight.fillAlpha = leftAlpha * 0.45;
    this.leftImpact.setAlpha(this.costVisible ? leftAlpha : 0);
    const leftX =
      this.cardCenterX - CARD_HALF_WIDTH - HINT_PAD + Math.min(0, dragOffset);
    this.leftImpact.x = leftX;
    this.leftEffect.x = leftX;
    this.leftEffect.setAlpha(this.leftEffect.text ? leftAlpha : 0);
    this.leftReward.x = leftX;
    this.leftReward.setAlpha(this.leftReward.text ? leftAlpha : 0);

    if (fuelAvailable || !this.costVisible) {
      this.fuelHighlight.fillColor = FUEL_HIGHLIGHT;
      this.fuelHighlight.fillAlpha = rightAlpha * 0.45;
      this.rightImpact.setText(`-${fuelCost} Fuel`).setColor("#4a2a08");
      this.rightEffect.setColor("#4a2a08");
    } else {
      this.fuelHighlight.fillColor = BLOCKED_HIGHLIGHT;
      this.fuelHighlight.fillAlpha = rightAlpha * 0.55;
      this.rightImpact.setText("No fuel left!").setColor("#ff5252");
      this.rightEffect.setColor("#ff5252");
    }
    this.rightImpact.setAlpha(this.costVisible ? rightAlpha : 0);
    const rightX =
      this.cardCenterX + CARD_HALF_WIDTH + HINT_PAD + Math.max(0, dragOffset);
    this.rightImpact.x = rightX;
    this.rightEffect.x = rightX;
    const canShowEffect = this.costVisible ? fuelAvailable : true;
    this.rightEffect.setAlpha(canShowEffect && this.rightEffect.text ? rightAlpha : 0);
    this.rightReward.x = rightX;
    this.rightReward.setAlpha(
      canShowEffect && this.rightReward.text ? rightAlpha : 0,
    );

    const leftSignalAlpha = this.signalVisible ? leftAlpha : 0;
    const rightSignalAlpha = this.signalVisible ? rightAlpha : 0;
    // Dots trail the effect text reading left-to-right. On the right side they
    // sit just after the text; on the left they flow outward so the whole hint
    // reads "●●● Send Off Signal" symmetrically with the right-side composition.
    const dotPad = 12;
    const leftTextLeftEdge = leftX - this.leftEffect.width;
    const leftDotsStart =
      leftTextLeftEdge - dotPad - (SIGNAL_SEQUENCE_LENGTH - 1) * DOT_SPACING;
    this.leftSignalDots.forEach((dot, i) => {
      dot.x = leftDotsStart + i * DOT_SPACING;
      dot.setAlpha(leftSignalAlpha);
    });
    const rightDotsStart = rightX + this.rightEffect.width + dotPad;
    this.rightSignalDots.forEach((dot, i) => {
      dot.x = rightDotsStart + i * DOT_SPACING;
      dot.setAlpha(rightSignalAlpha);
    });
  }
}

function ramp(distance: number): number {
  if (distance <= HINT_FADE_PX) return 0;
  return Math.min(1, (distance - HINT_FADE_PX) / (HINT_FULL_PX - HINT_FADE_PX));
}
