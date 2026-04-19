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

    this.load.audio("ambient", "audio/ambient.wav");
    this.load.audio("hitHurt", "audio/hitHurt.wav");
    this.load.audio("hitHurt1", "audio/hitHurt%20(1).wav");
    this.load.audio("hitHurt2", "audio/hitHurt%20(2).wav");
    this.load.audio("hitHurt3", "audio/hitHurt%20(3).wav");
    this.load.audio("synth_1", "audio/synth_1.wav");
    this.load.audio("synth_2", "audio/synth_2.wav");
    this.load.audio("synth_3", "audio/synth_3.wav");
    this.load.audio("synth_4", "audio/synth_4.wav");
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
