import Phaser from "phaser";
import { Card } from "../game/Card";

export type SwipeDirection = "left" | "right";
export type SwipeCallback = (direction: SwipeDirection) => void;
export type SwipePredicate = (direction: SwipeDirection) => boolean;

const CARD_W = 248;
const SWIPE_THRESHOLD = 160;
const MAX_ROTATION = 0.35;

export class CardView {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Image;
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

    this.sprite = scene.add
      .image(0, 0, "card")
      .setInteractive({ useHandCursor: true });

    this.container.add(this.sprite);

    this.sprite.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  show(_card: Card): void {
    this.locked = false;
    this.container.setPosition(this.homeX, this.homeY);
    this.container.setRotation(0);
    this.container.setAlpha(1);
    this.container.setScale(1);
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
