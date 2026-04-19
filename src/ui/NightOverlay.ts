import Phaser from "phaser";
import { createText } from "./fonts";

const FADE_IN_MS = 600;
const FADE_OUT_MS = 600;
const HOLD_MS = 5000;

// Full-screen "Night X" title card. Fades the whole scene to black, shows
// the label, then either auto-dismisses after HOLD_MS or on pointerdown,
// whichever comes first. Fires `onComplete` once the fade-out finishes.
export class NightOverlay {
  private scene: Phaser.Scene;
  private dim: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Rectangle;
  private holdTimer?: Phaser.Time.TimerEvent;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    this.dim = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0)
      .setDepth(500);

    this.text = createText(scene, width / 2, height / 2, "", {
      fontSize: "180px",
      color: "#ffffff",
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(501);

    this.hitArea = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.001)
      .setOrigin(0)
      .setDepth(502)
      .setInteractive()
      .setVisible(false);
    this.hitArea.on("pointerdown", () => this.dismiss());
  }

  play(
    nightNumber: number,
    onComplete: () => void,
    opts: { instant?: boolean } = {},
  ): void {
    if (this.active) return;
    this.active = true;
    this.text.setText(`Night ${nightNumber}`).setAlpha(opts.instant ? 1 : 0);
    this.dim.fillAlpha = opts.instant ? 1 : 0;
    this.hitArea.setVisible(true);

    if (!opts.instant) {
      this.scene.tweens.add({
        targets: this.dim,
        fillAlpha: 1,
        duration: FADE_IN_MS,
        ease: "Cubic.Out",
      });
      this.scene.tweens.add({
        targets: this.text,
        alpha: 1,
        duration: FADE_IN_MS,
        ease: "Cubic.Out",
      });
    }

    this.holdTimer = this.scene.time.delayedCall(HOLD_MS, () => this.dismiss());

    const finish = () => {
      this.active = false;
      this.hitArea.setVisible(false);
      onComplete();
    };

    this.dismissCallback = () => {
      this.holdTimer?.remove(false);
      this.holdTimer = undefined;
      this.scene.tweens.killTweensOf(this.text);
      this.scene.tweens.killTweensOf(this.dim);
      this.scene.tweens.add({
        targets: this.text,
        alpha: 0,
        duration: FADE_OUT_MS / 2,
      });
      this.scene.tweens.add({
        targets: this.dim,
        fillAlpha: 0,
        duration: FADE_OUT_MS,
        onComplete: finish,
      });
    };
  }

  private dismissCallback: (() => void) | null = null;

  private dismiss(): void {
    if (!this.active) return;
    const cb = this.dismissCallback;
    this.dismissCallback = null;
    cb?.();
  }
}
