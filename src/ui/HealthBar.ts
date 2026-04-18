import Phaser from "phaser";
import { createText } from "./fonts";

export interface HealthBarOptions {
  width: number;
  height: number;
  fillColor: number;
  bgColor?: number;
  borderColor?: number;
  showText?: boolean;
}

export class HealthBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;
  private opts: Required<HealthBarOptions>;
  private current = 0;
  private max = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: HealthBarOptions,
  ) {
    this.opts = {
      bgColor: 0x111111,
      borderColor: 0xffffff,
      showText: true,
      ...options,
    };

    this.bg = scene.add
      .rectangle(x, y, this.opts.width, this.opts.height, this.opts.bgColor)
      .setStrokeStyle(2, this.opts.borderColor)
      .setOrigin(0.5);

    this.fill = scene.add
      .rectangle(
        x - this.opts.width / 2 + 2,
        y,
        this.opts.width - 4,
        this.opts.height - 4,
        this.opts.fillColor,
      )
      .setOrigin(0, 0.5);

    if (this.opts.showText) {
      this.label = createText(scene, x, y, "", {
        fontSize: `${Math.floor(this.opts.height * 0.7)}px`,
        color: "#ffffff",
      }).setOrigin(0.5);
    }
  }

  set(current: number, max: number): void {
    this.current = current;
    this.max = max;
    const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, current / max));
    this.fill.width = (this.opts.width - 4) * ratio;
    if (this.label) this.label.setText(`${current}/${max}`);
  }

  setVisible(visible: boolean): void {
    this.bg.setVisible(visible);
    this.fill.setVisible(visible);
    this.label?.setVisible(visible);
  }
}
