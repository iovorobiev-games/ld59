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
  private label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: HealthBarOptions,
  ) {
    this.label = createText(scene, x, y, "", {
      fontSize: `${Math.floor(options.height * 0.9)}px`,
      color: "#ffffff",
    }).setOrigin(0.5);
  }

  set(current: number, max: number): void {
    this.label.setText(`${current}/${max}`);
  }

  setVisible(visible: boolean): void {
    this.label.setVisible(visible);
  }
}
