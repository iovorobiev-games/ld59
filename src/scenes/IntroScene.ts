import Phaser from "phaser";
import { createText } from "../ui/fonts";
import { applyCrtPipeline } from "../pipelines/CrtPipeline";

const LINES: readonly string[] = [
  "Who am I?",
  "The only thing I remember is a...",
  "Lighthouse.",
];

const FADE_IN_MS = 1200;
const HOLD_MS = 2400;
const FADE_OUT_MS = 1000;

export class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: "IntroScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#000000");
    applyCrtPipeline(this);
    this.playLine(0, width / 2, height / 2);
  }

  private playLine(index: number, cx: number, cy: number): void {
    if (index >= LINES.length) {
      this.scene.start("GameScene");
      return;
    }
    const text = createText(this, cx, cy, LINES[index], {
      fontSize: "96px",
      color: "#879382",
    })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: FADE_IN_MS,
      onComplete: () => {
        this.time.delayedCall(HOLD_MS, () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            duration: FADE_OUT_MS,
            onComplete: () => {
              text.destroy();
              this.playLine(index + 1, cx, cy);
            },
          });
        });
      },
    });
  }
}
