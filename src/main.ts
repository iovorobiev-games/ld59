import Phaser from "phaser";
import { loadGameFont } from "./ui/fonts";
import { SplashScene } from "./scenes/SplashScene";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";
import {
  SilhouettePipeline,
  SILHOUETTE_PIPELINE_KEY,
} from "./pipelines/SilhouettePipeline";
import { CrtPipeline, CRT_PIPELINE_KEY } from "./pipelines/CrtPipeline";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  scene: [SplashScene, BootScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  render: {
    roundPixels: true,
  },
  callbacks: {
    postBoot: (game) => {
      const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      if (renderer.pipelines) {
        renderer.pipelines.addPostPipeline(
          SILHOUETTE_PIPELINE_KEY,
          SilhouettePipeline,
        );
        renderer.pipelines.addPostPipeline(CRT_PIPELINE_KEY, CrtPipeline);
      }
    },
  },
};

loadGameFont().finally(() => {
  new Phaser.Game(config);
});
