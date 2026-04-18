import Phaser from "phaser";
import { createText } from "../ui/fonts";
import { applyCrtPipeline } from "../pipelines/CrtPipeline";

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: "SplashScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#000000");
    applyCrtPipeline(this);

    const title = createText(this, width / 2, height / 2, "IOVO Games", {
      fontSize: "220px",
    })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 1000,
      hold: 800,
      yoyo: true,
      onComplete: () => this.scene.start("BootScene"),
    });
  }
}
