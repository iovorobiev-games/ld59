import Phaser from "phaser";
import { AbilityIntent } from "../game/Ability";
import { HealthBar } from "./HealthBar";
import { createText } from "./fonts";

export interface EnemyVisual {
  bodyColor: number;
  bodyWidth: number;
  bodyHeight: number;
}

export const DEFAULT_ENEMY_VISUAL: EnemyVisual = {
  bodyColor: 0x6a1f33,
  bodyWidth: 180,
  bodyHeight: 240,
};

export class EnemyView {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private nameLabel: Phaser.GameObjects.Text;
  private reductionLabel: Phaser.GameObjects.Text;
  private intentBg: Phaser.GameObjects.Rectangle;
  private intentLabel: Phaser.GameObjects.Text;
  private healthBar: HealthBar;

  constructor(scene: Phaser.Scene, anchorX: number, groundY: number) {
    this.scene = scene;
    this.container = scene.add.container(anchorX, groundY);

    const v = DEFAULT_ENEMY_VISUAL;
    this.body = scene.add
      .rectangle(0, -v.bodyHeight / 2, v.bodyWidth, v.bodyHeight, v.bodyColor)
      .setStrokeStyle(4, 0x180404);

    this.nameLabel = createText(scene, 0, -v.bodyHeight - 70, "", {
      fontSize: "32px",
      color: "#ffd0d0",
    }).setOrigin(0.5);

    this.reductionLabel = createText(scene, 0, -v.bodyHeight / 2, "", {
      fontSize: "28px",
      color: "#9fd6ff",
    }).setOrigin(0.5);

    this.intentBg = scene.add
      .rectangle(0, -v.bodyHeight - 130, 140, 52, 0x1a0608, 0.85)
      .setStrokeStyle(2, 0xffb347);
    this.intentLabel = createText(scene, 0, -v.bodyHeight - 130, "", {
      fontSize: "30px",
      color: "#ffd27a",
    }).setOrigin(0.5);

    this.container.add([
      this.body,
      this.nameLabel,
      this.reductionLabel,
      this.intentBg,
      this.intentLabel,
    ]);

    this.healthBar = new HealthBar(scene, anchorX, groundY - v.bodyHeight - 30, {
      width: 220,
      height: 26,
      fillColor: 0xff5252,
    });

    this.setIntent(null);
    this.hide();
  }

  show(name: string, health: number, maxHealth: number, visual?: Partial<EnemyVisual>): void {
    const v = { ...DEFAULT_ENEMY_VISUAL, ...visual };
    this.body.setSize(v.bodyWidth, v.bodyHeight);
    this.body.fillColor = v.bodyColor;
    this.body.y = -v.bodyHeight / 2;
    this.nameLabel.y = -v.bodyHeight - 70;
    this.reductionLabel.y = -v.bodyHeight / 2;
    this.intentBg.y = -v.bodyHeight - 130;
    this.intentLabel.y = -v.bodyHeight - 130;
    this.nameLabel.setText(name);
    this.container.setVisible(true);
    this.healthBar.set(health, maxHealth);
    this.setVisible(true);
  }

  setHealth(current: number, max: number): void {
    this.healthBar.set(current, max);
  }

  setPendingReduction(amount: number): void {
    if (amount > 0) {
      this.reductionLabel.setText(`-${amount} dmg`);
      this.reductionLabel.setVisible(true);
    } else {
      this.reductionLabel.setVisible(false);
    }
  }

  setIntent(intent: AbilityIntent | null): void {
    if (!intent) {
      this.intentBg.setVisible(false);
      this.intentLabel.setVisible(false);
      return;
    }
    const text =
      intent.value !== undefined ? `${intent.icon} ${intent.value}` : `${intent.icon} ${intent.label}`;
    this.intentLabel.setText(text);
    const padding = 28;
    const width = Math.max(120, this.intentLabel.width + padding);
    this.intentBg.setSize(width, 52);
    this.intentBg.setVisible(true);
    this.intentLabel.setVisible(true);
  }

  flashHit(): void {
    this.scene.tweens.killTweensOf(this.body);
    const original = this.body.fillColor;
    this.body.fillColor = 0xffffff;
    this.scene.tweens.add({
      targets: this.body,
      fillAlpha: { from: 1, to: 0.4 },
      duration: 80,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.body.fillColor = original;
        this.body.fillAlpha = 1;
      },
    });
  }

  flashAttack(): void {
    this.scene.tweens.killTweensOf(this.container);
    const baseX = this.container.x;
    this.scene.tweens.add({
      targets: this.container,
      x: baseX + 60,
      duration: 100,
      yoyo: true,
      ease: "Cubic.Out",
      onComplete: () => (this.container.x = baseX),
    });
  }

  hide(): void {
    this.setVisible(false);
  }

  private setVisible(v: boolean): void {
    this.container.setVisible(v);
    this.healthBar.setVisible(v);
    if (!v) {
      this.intentBg.setVisible(false);
      this.intentLabel.setVisible(false);
    }
  }
}
