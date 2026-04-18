import Phaser from "phaser";
import { AbilityIntent } from "../game/Ability";
import { HealthBar } from "./HealthBar";
import { createText } from "./fonts";
import { SILHOUETTE_PIPELINE_KEY } from "../pipelines/SilhouettePipeline";

const LIGHT_OFF_TINT = 0x0b0c06;

export interface EnemyVisual {
  spriteKey: string;
}

export const DEFAULT_ENEMY_VISUAL: EnemyVisual = {
  spriteKey: "tentacle",
};

export class EnemyView {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Image;
  private nameLabel: Phaser.GameObjects.Text;
  private reductionLabel: Phaser.GameObjects.Text;
  private intentBg: Phaser.GameObjects.Rectangle;
  private intentLabel: Phaser.GameObjects.Text;
  private healthBar: HealthBar;

  constructor(
    scene: Phaser.Scene,
    anchorX: number,
    groundY: number,
    bodyCenterY: number,
  ) {
    this.scene = scene;
    this.container = scene.add.container(anchorX, groundY);

    const bodyRestY = bodyCenterY - groundY;
    this.body = scene.add
      .image(0, bodyRestY, DEFAULT_ENEMY_VISUAL.spriteKey)
      .setOrigin(0.5, 0.5);
    scene.tweens.add({
      targets: this.body,
      y: bodyRestY - 12,
      duration: 1800,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    const intentY = -(groundY - 60);
    const nameY = intentY + 70;
    const reductionY = nameY + 60;

    this.intentBg = scene.add
      .rectangle(0, intentY, 140, 52, 0x1a0608, 0.85)
      .setStrokeStyle(2, 0xffb347);
    this.intentLabel = createText(scene, 0, intentY, "", {
      fontSize: "30px",
      color: "#ffd27a",
    }).setOrigin(0.5);

    this.nameLabel = createText(scene, 0, nameY, "", {
      fontSize: "32px",
      color: "#ffd0d0",
    }).setOrigin(0.5);

    this.reductionLabel = createText(scene, 0, reductionY, "", {
      fontSize: "28px",
      color: "#9fd6ff",
    }).setOrigin(0.5);

    this.container.add([
      this.body,
      this.nameLabel,
      this.reductionLabel,
      this.intentBg,
      this.intentLabel,
    ]);

    this.healthBar = new HealthBar(scene, anchorX, groundY + reductionY + 40, {
      width: 220,
      height: 26,
      fillColor: 0xff5252,
    });

    this.setIntent(null);
    this.hide();
  }

  show(name: string, health: number, maxHealth: number, visual?: Partial<EnemyVisual>): void {
    const v = { ...DEFAULT_ENEMY_VISUAL, ...visual };
    this.body.setTexture(v.spriteKey);
    this.nameLabel.setText(name);
    this.container.setVisible(true);
    this.healthBar.set(health, maxHealth);
    this.setVisible(true);
  }

  setLight(on: boolean): void {
    if (on) {
      this.body.resetPostPipeline();
      this.body.clearTint();
    } else {
      this.body.setPostPipeline(SILHOUETTE_PIPELINE_KEY);
      this.body.setTint(LIGHT_OFF_TINT);
    }
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
    this.body.setTintFill(0xffffff);
    this.scene.time.delayedCall(120, () => {
      this.body.clearTint();
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
