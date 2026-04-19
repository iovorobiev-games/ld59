import Phaser from "phaser";
import { createText } from "./fonts";

export interface NightProgress {
  nightNumber: number;
  position: number;
  total: number;
}

const BAR_WIDTH = 360;
const BAR_HEIGHT = 6;
const BAR_COLOR = 0xf0d089;
const NOTCH_HEIGHT = 18;
const NOTCH_WIDTH = 4;
const NOTCH_COLOR = 0xf0d089;
const LIT_SCALE = 0.55;
const LIT_OFFSET_Y = -20;
const SLIDE_MS = 380;
const LABEL_GAP = 8;

export class NightProgressView {
  private container: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Rectangle;
  private notches: Phaser.GameObjects.Rectangle[] = [];
  private lit: Phaser.GameObjects.Image;
  private duskLabel: Phaser.GameObjects.Text;
  private dawnLabel: Phaser.GameObjects.Text;
  private slideTween?: Phaser.Tweens.Tween;
  private currentTotal = 0;

  constructor(private readonly scene: Phaser.Scene, screenWidth: number, y: number) {
    const cx = screenWidth / 2;
    this.container = scene.add.container(cx, y).setDepth(90);

    this.bar = scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, BAR_COLOR, 1)
      .setOrigin(0.5);
    this.container.add(this.bar);

    this.duskLabel = createText(scene, -BAR_WIDTH / 2 - LABEL_GAP, 0, "Dusk", {
      fontSize: "28px",
      color: "#f0d089",
    }).setOrigin(1, 0.5);

    this.dawnLabel = createText(scene, BAR_WIDTH / 2 + LABEL_GAP, 0, "Dawn", {
      fontSize: "28px",
      color: "#f0d089",
    }).setOrigin(0, 0.5);

    this.container.add([this.duskLabel, this.dawnLabel]);

    this.lit = scene.add
      .image(-BAR_WIDTH / 2, LIT_OFFSET_Y, "lit")
      .setOrigin(0.5, 1)
      .setScale(LIT_SCALE);
    this.container.add(this.lit);

    this.container.setVisible(false);
  }

  update(progress: NightProgress | null): void {
    if (!progress || progress.total <= 0) {
      this.container.setVisible(false);
      return;
    }
    this.container.setVisible(true);
    this.ensureNotches(progress.total);
    const targetX = this.notchX(progress.position, progress.total);
    if (this.slideTween) this.slideTween.stop();
    this.slideTween = this.scene.tweens.add({
      targets: this.lit,
      x: targetX,
      duration: SLIDE_MS,
      ease: "Cubic.Out",
    });
  }

  private ensureNotches(total: number): void {
    if (total === this.currentTotal) return;
    for (const n of this.notches) n.destroy();
    this.notches = [];
    for (let i = 0; i < total; i++) {
      const x = this.notchX(i + 1, total);
      const notch = this.scene.add
        .rectangle(x, 0, NOTCH_WIDTH, NOTCH_HEIGHT, NOTCH_COLOR, 1)
        .setOrigin(0.5);
      this.notches.push(notch);
      this.container.add(notch);
    }
    // Keep the lit icon on top of notches and bar.
    this.container.bringToTop(this.lit);
    this.currentTotal = total;
  }

  // Notches span left tip → right tip, evenly. Lit icon parks on the notch
  // matching the current position; position 0 (NightEncounter marker still
  // active) maps to notch 1 since the overlay covers the indicator anyway.
  private notchX(position: number, total: number): number {
    const left = -BAR_WIDTH / 2;
    if (total <= 1) return 0;
    const step = BAR_WIDTH / (total - 1);
    const idx = Math.max(1, Math.min(total, position)) - 1;
    return left + step * idx;
  }
}
