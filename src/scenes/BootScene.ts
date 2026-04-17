import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Load assets from public/sprites/ here.
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
