import Phaser from "phaser";
import { HealthBar } from "./HealthBar";
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
  private lightOn = true;

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
      .setOrigin(0.5, 1);

    const lampX = lighthouseX;
    const lampY = groundY + LAMP_OFFSET_Y;
    const beamSpread = 90;
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
      .setDepth(100);
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
      .setDepth(100);

    this.healthBar = new HealthBar(scene, cx, 60, {
      width: 360,
      height: 36,
      fillColor: 0xff5252,
    });
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
    const beams = [this.leftBeam, this.rightBeam];
    this.scene.tweens.killTweensOf(beams);
    beams.forEach((b) => (b.fillAlpha = on ? BEAM_ALPHA_ON : 0));
  }

  flashLight(): void {
    const beams = [this.leftBeam, this.rightBeam];
    this.scene.tweens.killTweensOf(beams);
    beams.forEach((b) => (b.fillAlpha = 1));
    this.scene.tweens.add({
      targets: beams,
      fillAlpha: this.lightOn ? BEAM_ALPHA_ON : 0,
      duration: 300,
      ease: "Cubic.Out",
    });
  }

  setHealth(current: number, max: number): void {
    this.healthBar.set(current, max);
  }
}
