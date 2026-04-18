import Phaser from "phaser";
import { SwipeDirection } from "../game/Encounter";
import { createText } from "./fonts";

export class FriendlyView {
  private container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Ellipse;
  private body: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private sequenceText: Phaser.GameObjects.Text;
  private rewardText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, anchorX: number, groundY: number) {
    this.container = scene.add.container(anchorX, groundY);

    this.glow = scene.add.ellipse(0, -90, 220, 220, 0xffe680, 0.25);
    this.body = scene.add
      .rectangle(0, -90, 130, 180, 0xe2d3a8)
      .setStrokeStyle(4, 0x4a2a08);
    this.label = createText(scene, 0, -260, "FRIENDLY", {
      fontSize: "30px",
      color: "#ffd97a",
    }).setOrigin(0.5);
    this.sequenceText = createText(scene, 0, -220, "", {
      fontSize: "28px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5);
    this.rewardText = createText(scene, 0, -90, "", {
      fontSize: "22px",
      color: "#4a2a08",
      align: "center",
    }).setOrigin(0.5);

    this.container.add([
      this.glow,
      this.body,
      this.label,
      this.sequenceText,
      this.rewardText,
    ]);
    this.hide();
  }

  show(sequence: SwipeDirection[], progress: number, rewardText: string): void {
    this.sequenceText.setText(this.formatSequence(sequence, progress));
    this.rewardText.setText(rewardText);
    this.container.setVisible(true);
  }

  private formatSequence(sequence: SwipeDirection[], progress: number): string {
    return sequence
      .map((d, i) => {
        const token = d === "left" ? "OFF" : "ON";
        if (i < progress) return `·${token}·`;
        if (i === progress) return `[${token}]`;
        return token;
      })
      .join("  ");
  }

  hide(): void {
    this.container.setVisible(false);
  }
}
