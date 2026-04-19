import Phaser from "phaser";
import { Card } from "../game/Card";

export type SwipeDirection = "left" | "right";
export type SwipeCallback = (direction: SwipeDirection) => void;
export type SwipePredicate = (direction: SwipeDirection) => boolean;

const CARD_W = 248;
const SWIPE_THRESHOLD = 160;
const MAX_ROTATION = 0.35;

// Slide the card far enough that BottomPanel's impact + effect text reach full
// opacity (HINT_FULL_PX in BottomPanel is 140).
const HINT_OFFSET_X = 150;
const HINT_ROTATION = 0.12;
const HINT_SLIDE_DURATION = 380;
const HINT_HOLD_DURATION = 1000;

const SHADOW_OFFSET_X = 10;
const SHADOW_OFFSET_Y = 14;
const SHADOW_ALPHA = 0.45;
const SHADOW_SCALE = 1.03;

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
  private hintTween?: Phaser.Tweens.Tween;
  private hintHoldTimer?: Phaser.Time.TimerEvent;
  private hintActive = false;

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

    const shadow = scene.add
      .image(SHADOW_OFFSET_X, SHADOW_OFFSET_Y, "card")
      .setTint(0x000000)
      .setAlpha(SHADOW_ALPHA)
      .setScale(SHADOW_SCALE);

    this.sprite = scene.add
      .image(0, 0, "card")
      .setInteractive({ useHandCursor: true });

    this.container.add([shadow, this.sprite]);

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

  // Play a hint animation toward `direction`. If `onCycleEnd` is provided,
  // plays a single cycle (slide in, hold, snap home) and invokes it. Otherwise
  // loops indefinitely until stopSwipeHint is called.
  startSwipeHint(direction: SwipeDirection, onCycleEnd?: () => void): void {
    this.cancelHint();
    this.hintActive = true;
    this.runHintCycle(direction, onCycleEnd);
  }

  private runHintCycle(
    direction: SwipeDirection,
    onCycleEnd?: () => void,
  ): void {
    if (!this.hintActive) return;
    const sign = direction === "right" ? 1 : -1;
    this.container.setPosition(this.homeX, this.homeY);
    this.container.setRotation(0);
    this.hintTween = this.scene.tweens.add({
      targets: this.container,
      x: this.homeX + HINT_OFFSET_X * sign,
      rotation: HINT_ROTATION * sign,
      duration: HINT_SLIDE_DURATION,
      ease: "Sine.Out",
      onComplete: () => {
        if (!this.hintActive) return;
        this.hintHoldTimer = this.scene.time.delayedCall(
          HINT_HOLD_DURATION,
          () => {
            if (!this.hintActive) return;
            // Snap home instantly, then either call back once or loop.
            this.container.setPosition(this.homeX, this.homeY);
            this.container.setRotation(0);
            if (onCycleEnd) {
              this.hintActive = false;
              onCycleEnd();
            } else {
              this.runHintCycle(direction);
            }
          },
        );
      },
    });
  }

  stopSwipeHint(): void {
    if (!this.hintActive && !this.hintTween && !this.hintHoldTimer) return;
    this.cancelHint();
    this.scene.tweens.add({
      targets: this.container,
      x: this.homeX,
      rotation: 0,
      duration: 160,
      ease: "Cubic.Out",
    });
  }

  private cancelHint(): void {
    this.hintActive = false;
    this.hintTween?.stop();
    this.hintTween = undefined;
    this.hintHoldTimer?.remove(false);
    this.hintHoldTimer = undefined;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.locked) return;
    this.cancelHint();
    this.scene.tweens.killTweensOf(this.container);
    this.container.setPosition(this.homeX, this.homeY);
    this.container.setRotation(0);
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

  // Returns the current horizontal offset from home, whether from a drag or
  // from a hint tween. BottomPanel uses this to fade in cost/outcome text.
  getDragOffset(): number {
    return this.container.x - this.homeX;
  }

  destroy(): void {
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.scene.input.off("pointerupoutside", this.handlePointerUp, this);
    this.container.destroy();
  }
}
