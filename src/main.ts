import Phaser from "phaser";
import { loadGameFont } from "./ui/fonts";
import { SplashScene } from "./scenes/SplashScene";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "game",
  backgroundColor: "#000000",
  scene: [SplashScene, BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  render: {
    roundPixels: true,
  },
};

loadGameFont().finally(() => {
  new Phaser.Game(config);
});
