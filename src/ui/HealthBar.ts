import Phaser from "phaser";
import { createText } from "./fonts";

export interface HealthBarOptions {
  width: number;
  height: number;
  fillColor: number;
  bgColor?: number;
  borderColor?: number;
  showText?: boolean;
  prefix?: string;
}

export class HealthBar {
  private label: Phaser.GameObjects.Text;
  private prefix: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: HealthBarOptions,
  ) {
    this.prefix = options.prefix ?? "";
    this.label = createText(scene, x, y, "", {
      fontSize: `${Math.floor(options.height * 0.9)}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);
  }

  set(current: number, max: number): void {
    this.label.setText(`${this.prefix}${current}/${max}`);
  }

  setVisible(visible: boolean): void {
    this.label.setVisible(visible);
  }

  setDepth(depth: number): void {
    this.label.setDepth(depth);
  }
}
