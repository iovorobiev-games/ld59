import Phaser from "phaser";
import { createText } from "../ui/fonts";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    createText(this, 960, 540, "LD59", { fontSize: "64px" }).setOrigin(0.5);
  }
}
