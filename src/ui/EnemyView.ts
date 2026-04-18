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
  private bodyRestY: number;
  private healthBarWorldX: number;
  private healthBarWorldY: number;
  private oscillateTween?: Phaser.Tweens.Tween;
  private arrivalTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    anchorX: number,
    groundY: number,
    bodyCenterY: number,
  ) {
    this.scene = scene;
    this.container = scene.add.container(anchorX, groundY);

    this.bodyRestY = bodyCenterY - groundY;
    this.body = scene.add
      .image(0, this.bodyRestY, DEFAULT_ENEMY_VISUAL.spriteKey)
      .setOrigin(0.5, 0.5);

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

    this.healthBarWorldX = anchorX;
    this.healthBarWorldY = groundY + reductionY + 40;
    this.healthBar = new HealthBar(scene, this.healthBarWorldX, this.healthBarWorldY, {
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
    this.playArrival();
  }

  private playArrival(): void {
    this.oscillateTween?.stop();
    this.oscillateTween = undefined;
    this.arrivalTween?.stop();

    const arrivalDuration = 900;
    this.body.y = this.bodyRestY + 700;
    this.arrivalTween = this.scene.tweens.add({
      targets: this.body,
      y: this.bodyRestY,
      duration: arrivalDuration,
      ease: "Cubic.Out",
      onComplete: () => this.startOscillation(),
    });
    this.scene.cameras.main.shake(arrivalDuration, 0.006);
  }

  private startOscillation(): void {
    this.oscillateTween?.stop();
    this.oscillateTween = this.scene.tweens.add({
      targets: this.body,
      y: this.bodyRestY - 12,
      duration: 1800,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
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

  flashHit(amount = 1): void {
    this.body.setTintFill(0xffffff);
    this.scene.time.delayedCall(120, () => {
      this.body.clearTint();
    });
    this.spawnDamageNumber(amount);
  }

  private spawnDamageNumber(amount: number): void {
    const x = this.healthBarWorldX + (Math.random() - 0.5) * 40;
    const y = this.healthBarWorldY;
    const text = createText(this.scene, x, y, `-${amount}`, {
      fontSize: "128px",
      color: "#ff3030",
      stroke: "#000000",
      strokeThickness: 8,
    })
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({
      targets: text,
      y: 0,
      alpha: 0,
      duration: 1400,
      ease: "Sine.Out",
      onComplete: () => text.destroy(),
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

  playAttack(
    targetX: number,
    onImpact: () => void,
    onComplete: () => void,
  ): void {
    this.scene.tweens.killTweensOf(this.container);
    const baseX = this.container.x;

    this.scene.tweens.add({
      targets: this.container,
      x: baseX - 80,
      duration: 260,
      ease: "Quad.In",
      onComplete: () => {
        let trailTimer: Phaser.Time.TimerEvent | undefined;
        trailTimer = this.scene.time.addEvent({
          delay: 30,
          repeat: 14,
          callback: () => this.spawnTrailGhost(),
        });
        this.scene.tweens.add({
          targets: this.container,
          x: targetX,
          duration: 320,
          ease: "Cubic.In",
          onComplete: () => {
            trailTimer?.remove();
            onImpact();
            this.scene.tweens.add({
              targets: this.container,
              x: baseX,
              duration: 520,
              ease: "Back.Out",
              onComplete,
            });
          },
        });
      },
    });
  }

  private spawnTrailGhost(): void {
    const key = this.body.texture.key;
    const ghost = this.scene.add
      .image(
        this.container.x + this.body.x,
        this.container.y + this.body.y,
        key,
      )
      .setOrigin(0.5, 0.5)
      .setAlpha(0.5)
      .setTint(0x6b9cff)
      .setDepth(5);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 260,
      ease: "Cubic.Out",
      onComplete: () => ghost.destroy(),
    });
  }

  hide(): void {
    this.oscillateTween?.stop();
    this.oscillateTween = undefined;
    this.arrivalTween?.stop();
    this.arrivalTween = undefined;
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
