import Phaser from "phaser";
import { createText } from "../ui/fonts";
import { applyCrtPipeline } from "../pipelines/CrtPipeline";

interface GameOverData {
  won?: boolean;
  fadeIn?: boolean;
}

const FADE_IN_MS = 1200;

export class GameOverScene extends Phaser.Scene {
  private won = false;
  private fadeIn = false;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: GameOverData): void {
    this.won = data?.won === true;
    this.fadeIn = data?.fadeIn === true;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(this.won ? "#0f1a05" : "#05080f");
    applyCrtPipeline(this);
    if (this.fadeIn) this.cameras.main.fadeIn(FADE_IN_MS, 0, 0, 0);

    createText(
      this,
      width / 2,
      height / 2 - 120,
      this.won ? "THANKS FOR PLAYING" : "GAME OVER",
      {
        fontSize: this.won ? "140px" : "180px",
        color: this.won ? "#a6ff52" : "#ff5252",
      },
    ).setOrigin(0.5);

    createText(
      this,
      width / 2,
      height / 2 + 20,
      this.won
        ? "Lightkeeper was made in 48 hours for Ludum Dare 59"
        : "the keeper lost his mind",
      { fontSize: "40px", color: "#cccccc" },
    ).setOrigin(0.5);

    const buttonW = 480;
    const buttonH = 110;
    const buttonY = height / 2 + 220;
    const button = this.add
      .rectangle(width / 2, buttonY, buttonW, buttonH, 0x222842)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const label = createText(this, width / 2, buttonY, this.won ? "Play Again" : "Try Again", {
      fontSize: "56px",
      color: "#ffffff",
    }).setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(0x39406a));
    button.on("pointerout", () => button.setFillStyle(0x222842));
    button.on("pointerdown", () => this.scene.start("GameScene"));

    void label;
  }
}
