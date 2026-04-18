import Phaser from "phaser";
import { Card } from "../game/Card";
import { createText } from "./fonts";

export type SwipeDirection = "left" | "right";
export type SwipeCallback = (direction: SwipeDirection) => void;
export type SwipePredicate = (direction: SwipeDirection) => boolean;

const CARD_W = 320;
const CARD_H = 440;
const SWIPE_THRESHOLD = 160;
const MAX_ROTATION = 0.35;

export class CardView {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private artBg: Phaser.GameObjects.Rectangle;
  private artShape: Phaser.GameObjects.Shape;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private homeX: number;
  private homeY: number;
  private dragging = false;
  private dragStartX = 0;
  private dragStartPointerX = 0;
  private locked = false;
  private onSwipe: SwipeCallback;
  private canSwipe: SwipePredicate;

  constructor(
    scene: Phaser.Scene,
    homeX: number,
    homeY: number,
    canSwipe: SwipePredicate,
    onSwipe: SwipeCallback,
  ) {
    this.scene = scene;
    this.homeX = homeX;
    this.homeY = homeY;
    this.canSwipe = canSwipe;
    this.onSwipe = onSwipe;

    this.container = scene.add.container(homeX, homeY);

    this.bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, 0xfaf3df)
      .setStrokeStyle(6, 0x2a1a0a)
      .setInteractive({ useHandCursor: true });

    this.artBg = scene.add
      .rectangle(0, -60, CARD_W - 50, CARD_H - 200, 0xe2d3a8)
      .setStrokeStyle(3, 0x2a1a0a);

    this.artShape = scene.add.rectangle(0, -60, 80, 80, 0x000000);

    this.title = createText(scene, 0, CARD_H / 2 - 70, "Card", {
      fontSize: "32px",
      color: "#2a1a0a",
    }).setOrigin(0.5);

    this.hint = createText(scene, 0, CARD_H / 2 - 30, "drag left or right", {
      fontSize: "18px",
      color: "#5a3a1a",
    }).setOrigin(0.5);

    this.container.add([this.bg, this.artBg, this.artShape, this.title, this.hint]);

    this.bg.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  show(card: Card): void {
    this.locked = false;
    this.container.setPosition(this.homeX, this.homeY);
    this.container.setRotation(0);
    this.container.setAlpha(1);
    this.container.setScale(1);
    this.title.setText(`Card #${card.id}`);
    this.renderArt(card);
  }

  private renderArt(card: Card): void {
    if (this.artShape) this.artShape.destroy();

    const palette = [0xc83232, 0x3266c8, 0x32a852, 0xc88e32, 0x9a32c8, 0x3a3a3a];
    const color = palette[card.seed % palette.length];
    const shapeKind = (card.seed >> 4) % 3;

    let shape: Phaser.GameObjects.Shape;
    if (shapeKind === 0) {
      shape = this.scene.add.rectangle(0, -60, 120, 120, color);
    } else if (shapeKind === 1) {
      shape = this.scene.add.circle(0, -60, 70, color);
    } else {
      shape = this.scene.add.triangle(0, -60, 0, -70, -75, 60, 75, 60, color);
    }
    shape.setStrokeStyle(3, 0x2a1a0a);
    this.artShape = shape;
    this.container.addAt(shape, 3);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.locked) return;
    this.dragging = true;
    this.dragStartX = this.container.x;
    this.dragStartPointerX = pointer.x;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || this.locked) return;
    const dx = pointer.x - this.dragStartPointerX;
    this.container.x = this.dragStartX + dx;
    const t = Phaser.Math.Clamp(dx / 400, -1, 1);
    this.container.rotation = t * MAX_ROTATION;
  }

  private handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || this.locked) return;
    this.dragging = false;
    const dx = this.container.x - this.homeX;

    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      const dir: SwipeDirection = dx < 0 ? "left" : "right";
      if (this.canSwipe(dir)) {
        this.flyOff(dir);
        return;
      }
    }
    this.snapBack();
  }

  private flyOff(dir: SwipeDirection): void {
    this.locked = true;
    const targetX = dir === "left" ? -CARD_W : this.scene.scale.width + CARD_W;
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      rotation: dir === "left" ? -MAX_ROTATION : MAX_ROTATION,
      alpha: 0,
      duration: 280,
      ease: "Cubic.In",
      onComplete: () => {
        this.onSwipe(dir);
      },
    });
  }

  private snapBack(): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.homeX,
      y: this.homeY,
      rotation: 0,
      duration: 220,
      ease: "Back.Out",
    });
  }

  getDragOffset(): number {
    if (!this.dragging) return 0;
    return this.container.x - this.homeX;
  }

  destroy(): void {
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.scene.input.off("pointerupoutside", this.handlePointerUp, this);
    this.container.destroy();
  }
}
