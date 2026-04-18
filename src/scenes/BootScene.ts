import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.image("card", "sprites/card.png");
    this.load.image("dark_light_bg", "sprites/dark_light_bg.png");
    this.load.image("lighthouse", "sprites/lighthouse.png");
    this.load.image("rock", "sprites/rock.png");
    this.load.image("tentacle", "sprites/tentacle.png");
    this.load.image("door", "sprites/door.png");
    this.load.image("pointer", "sprites/pointer.png");
    this.load.image("wizard", "sprites/characters/wizard.png");
    this.load.image("bandit", "sprites/characters/bandit.png");
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
