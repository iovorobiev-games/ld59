import Phaser from "phaser";
import { createText } from "./fonts";

export interface EncounterOverlayLayout {
  dimX: number;
  dimY: number;
  dimWidth: number;
  dimHeight: number;
  textX: number;
  textY: number;
}

export class EncounterOverlay {
  private scene: Phaser.Scene;
  private dim: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, layout: EncounterOverlayLayout) {
    this.scene = scene;

    this.dim = scene.add
      .rectangle(layout.dimX, layout.dimY, layout.dimWidth, layout.dimHeight, 0x000000, 0)
      .setOrigin(0)
      .setDepth(50);

    this.text = createText(scene, layout.textX, layout.textY, "", {
      fontSize: "96px",
      color: "#ffffff",
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(51);
  }

  play(message: string, holdMs: number, onComplete: () => void): void {
    this.text.setText(message).setAlpha(0);
    this.dim.fillAlpha = 0;
    this.scene.tweens.add({
      targets: this.dim,
      fillAlpha: 0.7,
      duration: 220,
      ease: "Cubic.Out",
    });
    this.scene.tweens.add({
      targets: this.text,
      alpha: 1,
      duration: 220,
      ease: "Cubic.Out",
    });

    this.scene.time.delayedCall(holdMs, () => {
      this.scene.tweens.add({
        targets: this.text,
        alpha: 0,
        duration: 220,
      });
      this.scene.tweens.add({
        targets: this.dim,
        fillAlpha: 0,
        duration: 220,
        onComplete,
      });
    });
  }
}
