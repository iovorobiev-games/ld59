import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.image("card", "sprites/card.png");
    this.load.image("dark_light_bg", "sprites/dark_light_bg.png");
    this.load.image("lighthouse", "sprites/lighthouse.png");
    this.load.image("lit", "sprites/lit.png");
    this.load.image("unlit", "sprites/unlit.png");
    this.load.image("rock", "sprites/rock.png");
    this.load.image("tentacle", "sprites/tentacle.png");
    this.load.image("door", "sprites/door.png");
    this.load.image("pointer", "sprites/pointer.png");
    this.load.image("wizard", "sprites/wizard.png");
    this.load.image("rogue", "sprites/rogue.png");
    this.load.image("fisher", "sprites/fisher.png");
    this.load.image("guard", "sprites/guard.png");
    this.load.image("ghost", "sprites/ghost.png");
    this.load.image("builder", "sprites/builder.png");
    this.load.image("kid", "sprites/kid.png");
    this.load.image("wife", "sprites/wife.png");
    this.load.image("winged_horror", "sprites/winged_horror.png");
    this.load.image("skywraith", "sprites/skywraith.png");
    this.load.image("fog", "sprites/fog.png");
    this.load.image("siren", "sprites/siren.png");
    this.load.image("ghost_ship", "sprites/ghost_ship.png");
    this.load.image("signals_list", "sprites/signals_list.png");

    this.load.audio("ambient", "audio/ambient.wav");
    this.load.audio("hitHurt", "audio/hitHurt.wav");
    this.load.audio("hitHurt1", "audio/hitHurt%20(1).wav");
    this.load.audio("hitHurt2", "audio/hitHurt%20(2).wav");
    this.load.audio("hitHurt3", "audio/hitHurt%20(3).wav");
    this.load.audio("synth_1", "audio/synth_1.wav");
    this.load.audio("synth_2", "audio/synth_2.wav");
    this.load.audio("synth_3", "audio/synth_3.wav");
    this.load.audio("synth_4", "audio/synth_4.wav");
    this.load.audio("explosion", "audio/explosion.wav");
    this.load.audio("click_light", "audio/click_light.wav");
  }

  create(): void {
    this.scene.start("IntroScene");
  }
}
