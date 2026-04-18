import Phaser from "phaser";
import { createText } from "./fonts";

export class FriendlyView {
  private container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Ellipse;
  private body: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, anchorX: number, groundY: number) {
    this.container = scene.add.container(anchorX, groundY);

    this.glow = scene.add
      .ellipse(0, -90, 220, 220, 0xffe680, 0.25);
    this.body = scene.add
      .rectangle(0, -90, 130, 180, 0xe2d3a8)
      .setStrokeStyle(4, 0x4a2a08);
    this.label = createText(scene, 0, -260, "FRIENDLY", {
      fontSize: "30px",
      color: "#ffd97a",
    }).setOrigin(0.5);
    this.hint = createText(scene, 0, -220, "", {
      fontSize: "22px",
      color: "#f5e6b8",
    }).setOrigin(0.5);

    this.container.add([this.glow, this.body, this.label, this.hint]);
    this.hide();
  }

  show(description: string): void {
    this.hint.setText(description);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }
}
