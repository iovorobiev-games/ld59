import Phaser from "phaser";
import { HealthBar } from "./HealthBar";

const SKY_LIT = 0x4a6f9c;
const SKY_DARK = 0x05080f;
const LIGHTHOUSE_LIT = 0xeeeeee;
const LIGHTHOUSE_DARK = 0x101010;
const STRIPE_LIT = 0xc83232;
const STRIPE_DARK = 0x180404;
const LAMP_OFF = 0x222222;
const LAMP_ON = 0xffe680;

export class LighthouseView {
  private scene: Phaser.Scene;
  private sky: Phaser.GameObjects.Rectangle;
  private body: Phaser.GameObjects.Polygon;
  private stripe1: Phaser.GameObjects.Rectangle;
  private stripe2: Phaser.GameObjects.Rectangle;
  private cap: Phaser.GameObjects.Polygon;
  private lampHousing: Phaser.GameObjects.Rectangle;
  private lamp: Phaser.GameObjects.Ellipse;
  private base: Phaser.GameObjects.Rectangle;
  private leftBeam: Phaser.GameObjects.Polygon;
  private rightBeam: Phaser.GameObjects.Polygon;
  private healthBar: HealthBar;
  private lightOn = true;

  constructor(scene: Phaser.Scene, areaWidth: number, areaHeight: number) {
    this.scene = scene;
    const cx = areaWidth / 2;
    const groundY = areaHeight - 30;

    this.sky = scene.add
      .rectangle(0, 0, areaWidth, areaHeight, SKY_LIT)
      .setOrigin(0);

    const bodyTopY = groundY - 360;
    const bodyBottomY = groundY;
    const bodyHalfTop = 50;
    const bodyHalfBottom = 90;
    this.body = scene.add.polygon(
      0,
      0,
      [
        cx - bodyHalfTop, bodyTopY,
        cx + bodyHalfTop, bodyTopY,
        cx + bodyHalfBottom, bodyBottomY,
        cx - bodyHalfBottom, bodyBottomY,
      ],
      LIGHTHOUSE_LIT,
    );
    this.body.setOrigin(0);

    this.stripe1 = scene.add
      .rectangle(cx, bodyTopY + 90, 110, 35, STRIPE_LIT)
      .setOrigin(0.5);
    this.stripe2 = scene.add
      .rectangle(cx, bodyTopY + 240, 140, 35, STRIPE_LIT)
      .setOrigin(0.5);

    const lampY = bodyTopY - 60;
    this.lampHousing = scene.add
      .rectangle(cx, lampY, 100, 80, LIGHTHOUSE_LIT)
      .setOrigin(0.5);
    this.lamp = scene.add.ellipse(cx, lampY, 60, 50, LAMP_ON);

    this.cap = scene.add.polygon(
      0,
      0,
      [
        cx - 70, lampY - 40,
        cx + 70, lampY - 40,
        cx, lampY - 130,
      ],
      LIGHTHOUSE_LIT,
    );
    this.cap.setOrigin(0);

    this.base = scene.add
      .rectangle(cx, groundY + 15, 260, 30, LIGHTHOUSE_LIT)
      .setOrigin(0.5);

    // Two beams shoot horizontally outward from the lamp.
    const beamSpread = 90;
    const beamColor = 0xfff2a8;
    this.leftBeam = scene.add
      .polygon(
        0,
        0,
        [
          cx, lampY,
          -40, lampY - beamSpread,
          -40, lampY + beamSpread,
        ],
        beamColor,
        0.0,
      )
      .setOrigin(0);
    this.rightBeam = scene.add
      .polygon(
        0,
        0,
        [
          cx, lampY,
          areaWidth + 40, lampY - beamSpread,
          areaWidth + 40, lampY + beamSpread,
        ],
        beamColor,
        0.0,
      )
      .setOrigin(0);

    this.healthBar = new HealthBar(scene, cx, 60, {
      width: 360,
      height: 36,
      fillColor: 0xff5252,
    });
  }

  setLight(on: boolean): void {
    this.lightOn = on;
    const targetSky = on ? SKY_LIT : SKY_DARK;
    const targetBody = on ? LIGHTHOUSE_LIT : LIGHTHOUSE_DARK;
    const targetStripe = on ? STRIPE_LIT : STRIPE_DARK;
    const targetLamp = on ? LAMP_ON : LAMP_OFF;

    this.sky.fillColor = targetSky;
    this.body.fillColor = targetBody;
    this.cap.fillColor = targetBody;
    this.lampHousing.fillColor = targetBody;
    this.base.fillColor = targetBody;
    this.stripe1.fillColor = targetStripe;
    this.stripe2.fillColor = targetStripe;
    this.lamp.fillColor = targetLamp;
  }

  flashLight(): void {
    const beams = [this.leftBeam, this.rightBeam];
    this.scene.tweens.killTweensOf(beams);
    beams.forEach((b) => (b.fillAlpha = 0.85));
    this.scene.tweens.add({
      targets: beams,
      fillAlpha: 0,
      duration: 600,
      ease: "Cubic.Out",
    });

    const originalLampColor = this.lamp.fillColor;
    this.lamp.fillColor = 0xffffff;
    this.scene.time.delayedCall(120, () => {
      this.lamp.fillColor = this.lightOn ? LAMP_ON : originalLampColor;
    });
  }

  setHealth(current: number, max: number): void {
    this.healthBar.set(current, max);
  }
}
