import Phaser from "phaser";
import { createText } from "../ui/fonts";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#05080f");

    createText(this, width / 2, height / 2 - 120, "GAME OVER", {
      fontSize: "180px",
      color: "#ff5252",
    }).setOrigin(0.5);

    createText(
      this,
      width / 2,
      height / 2 + 20,
      "the keeper lost his mind",
      { fontSize: "48px", color: "#cccccc" },
    ).setOrigin(0.5);

    const buttonW = 480;
    const buttonH = 110;
    const buttonY = height / 2 + 220;
    const button = this.add
      .rectangle(width / 2, buttonY, buttonW, buttonH, 0x222842)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const label = createText(this, width / 2, buttonY, "Try Again", {
      fontSize: "56px",
      color: "#ffffff",
    }).setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(0x39406a));
    button.on("pointerout", () => button.setFillStyle(0x222842));
    button.on("pointerdown", () => this.scene.start("GameScene"));

    void label;
  }
}
