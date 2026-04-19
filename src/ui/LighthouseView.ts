import Phaser from "phaser";
import { HealthBar } from "./HealthBar";
import { createText } from "./fonts";
import { SILHOUETTE_PIPELINE_KEY } from "../pipelines/SilhouettePipeline";

const SKY_COLOR = 0x0b0c06;
const LIGHT_OFF_TINT = 0x0b0c06;
const BEAM_ALPHA_ON = 0.7;

const LIGHTHOUSE_WIDTH = 252;
const LIGHTHOUSE_HEIGHT = 487;
const LIGHTHOUSE_BOTTOM_OFFSET = 30;
const LIGHTHOUSE_X_OFFSET = LIGHTHOUSE_WIDTH / 2;
const LAMP_OFFSET_Y = -LIGHTHOUSE_HEIGHT + 50 + 60;

export class LighthouseView {
  private scene: Phaser.Scene;
  private sky: Phaser.GameObjects.Rectangle;
  private rock: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private leftBeam: Phaser.GameObjects.Polygon;
  private rightBeam: Phaser.GameObjects.Polygon;
  private healthBar: HealthBar;
  private armorLabel: Phaser.GameObjects.Text;
  private lightOn = true;
  private impactX: number;
  private impactY: number;

  constructor(
    scene: Phaser.Scene,
    areaWidth: number,
    areaHeight: number,
    sceneHeight: number,
  ) {
    this.scene = scene;
    const cx = areaWidth / 2;
    const lighthouseX = cx + LIGHTHOUSE_X_OFFSET;
    const groundY = areaHeight - LIGHTHOUSE_BOTTOM_OFFSET;

    this.sky = scene.add
      .rectangle(0, 0, areaWidth, sceneHeight, SKY_COLOR)
      .setOrigin(0);

    this.rock = scene.add
      .image(areaWidth, sceneHeight, "rock")
      .setOrigin(1, 1);

    this.body = scene.add
      .image(lighthouseX, groundY, "lighthouse")
      .setOrigin(0.5, 1)
      .setDepth(1);

    this.impactX = lighthouseX - LIGHTHOUSE_WIDTH / 2 - 40;
    this.impactY = groundY - LIGHTHOUSE_HEIGHT / 2;

    const lampX = lighthouseX - 8;
    const lampY = groundY + LAMP_OFFSET_Y - 8;
    const beamSpread = 200;
    const beamColor = 0xfff2a8;
    this.leftBeam = scene.add
      .polygon(
        0,
        0,
        [
          lampX, lampY,
          -40, lampY - beamSpread,
          -40, lampY + beamSpread,
        ],
        beamColor,
        0.0,
      )
      .setOrigin(0)
      .setDepth(2);
    this.rightBeam = scene.add
      .polygon(
        0,
        0,
        [
          lampX, lampY,
          areaWidth + 40, lampY - beamSpread,
          areaWidth + 40, lampY + beamSpread,
        ],
        beamColor,
        0.0,
      )
      .setOrigin(0)
      .setDepth(2);

    this.healthBar = new HealthBar(scene, cx, 60, {
      width: 360,
      height: 36,
      fillColor: 0xff5252,
    });

    this.armorLabel = createText(scene, cx, 100, "", {
      fontSize: "26px",
      color: "#9fd6ff",
    })
      .setOrigin(0.5)
      .setVisible(false);

    this.scheduleFlicker();
  }

  private beams(): Phaser.GameObjects.Polygon[] {
    return [this.leftBeam, this.rightBeam];
  }

  private baseAlpha(): number {
    return this.lightOn ? BEAM_ALPHA_ON : 0;
  }

  setLight(on: boolean): void {
    this.lightOn = on;
    if (on) {
      this.body.resetPostPipeline();
      this.body.clearTint();
    } else {
      this.body.setPostPipeline(SILHOUETTE_PIPELINE_KEY);
      this.body.setTint(LIGHT_OFF_TINT);
    }
    const beams = this.beams();
    this.scene.tweens.killTweensOf(beams);
    beams.forEach((b) => (b.fillAlpha = this.baseAlpha()));
  }

  flashLight(): void {
    const beams = this.beams();
    this.scene.tweens.killTweensOf(beams);
    beams.forEach((b) => (b.fillAlpha = 1));
    this.scene.tweens.add({
      targets: beams,
      fillAlpha: this.baseAlpha(),
      duration: 300,
      ease: "Cubic.Out",
    });
  }

  private scheduleFlicker(): void {
    const delay = Phaser.Math.Between(500, 2200);
    this.scene.time.delayedCall(delay, () => {
      this.scheduleFlicker();
      if (!this.lightOn) return;
      const beams = this.beams();
      if (this.scene.tweens.getTweensOf(beams[0]).length > 0) return;
      const dimAlpha = Phaser.Math.FloatBetween(0.25, 0.5);
      this.scene.tweens.add({
        targets: beams,
        fillAlpha: dimAlpha,
        duration: Phaser.Math.Between(50, 130),
        yoyo: true,
        ease: "Sine.InOut",
        onComplete: () => {
          if (this.lightOn) {
            beams.forEach((b) => (b.fillAlpha = BEAM_ALPHA_ON));
          }
        },
      });
    });
  }

  setHealth(current: number, max: number): void {
    this.healthBar.set(current, max);
  }

  setArmor(amount: number): void {
    if (amount > 0) {
      this.armorLabel.setText(`\u26e8 ${amount} armor`);
      this.armorLabel.setVisible(true);
    } else {
      this.armorLabel.setVisible(false);
    }
  }

  getImpactPoint(): { x: number; y: number } {
    return { x: this.impactX, y: this.impactY };
  }

  playHit(): void {
    this.scene.tweens.killTweensOf(this.body);
    const baseX = this.body.x;
    this.body.setTintFill(0xff8080);
    this.scene.time.delayedCall(150, () => this.body.clearTint());
    this.scene.tweens.add({
      targets: this.body,
      x: baseX + 20,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => (this.body.x = baseX),
    });
  }
}
