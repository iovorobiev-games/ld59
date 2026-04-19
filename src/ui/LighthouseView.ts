import Phaser from "phaser";
import { HealthBar } from "./HealthBar";
import { createText } from "./fonts";
import { SILHOUETTE_PIPELINE_KEY } from "../pipelines/SilhouettePipeline";
import { LightState, SIGNAL_SEQUENCE_LENGTH } from "../game/Signal";
import { Sfx } from "../audio/Sfx";

const SKY_COLOR = 0x0b0c06;
const LIGHT_OFF_TINT = 0x0b0c06;
const BEAM_ALPHA_ON = 0.7;

const LIGHTHOUSE_WIDTH = 252;
const LIGHTHOUSE_HEIGHT = 487;
const LIGHTHOUSE_BOTTOM_OFFSET = 30;
const LIGHTHOUSE_X_OFFSET = LIGHTHOUSE_WIDTH / 2;
const LAMP_OFFSET_Y = -LIGHTHOUSE_HEIGHT + 50 + 60;

// HUD overlay offsets from the lighthouse ground (bottom of sprite). Values are
// tuned to land between the two painted bands on the tower so the plaque reads
// against a flat middle section.
const HUD_HP_Y = -300;
const HUD_SIGNAL_LABEL_Y = -262;
const HUD_SIGNAL_Y = -210;
const HUD_ARMOR_Y = -150;
const SIGNAL_PIP_SPACING = 50;
const HUD_DEPTH = 3;
const SIGNAL_LABEL_COLOR = "#f5e6b8";

export class LighthouseView {
  private scene: Phaser.Scene;
  private sky: Phaser.GameObjects.Rectangle;
  private rock: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private leftBeam: Phaser.GameObjects.Polygon;
  private rightBeam: Phaser.GameObjects.Polygon;
  private healthBar: HealthBar;
  private armorLabel: Phaser.GameObjects.Text;
  private signalLabel: Phaser.GameObjects.Text;
  private signalPips: Phaser.GameObjects.Image[] = [];
  private signalCenterX = 0;
  private signalY = 0;
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

    this.healthBar = new HealthBar(scene, lighthouseX, groundY + HUD_HP_Y, {
      width: 160,
      height: 32,
      fillColor: 0xff5252,
    });
    this.healthBar.setDepth(HUD_DEPTH);

    this.signalLabel = createText(
      scene,
      lighthouseX,
      groundY + HUD_SIGNAL_LABEL_Y,
      "Current Signal:",
      {
        fontSize: "22px",
        color: SIGNAL_LABEL_COLOR,
        stroke: "#000000",
        strokeThickness: 3,
      },
    )
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH);

    this.signalCenterX = lighthouseX;
    this.signalY = groundY + HUD_SIGNAL_Y;
    for (let i = 0; i < SIGNAL_SEQUENCE_LENGTH; i++) {
      const pip = scene.add
        .image(lighthouseX, this.signalY, "unlit")
        .setOrigin(0.5)
        .setDepth(HUD_DEPTH);
      this.signalPips.push(pip);
    }
    this.resetSignalLayout([]);

    this.armorLabel = createText(scene, lighthouseX, groundY + HUD_ARMOR_Y, "", {
      fontSize: "24px",
      color: "#9fd6ff",
      stroke: "#000000",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
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
    Sfx.clickLight(this.scene);
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

  setSignal(sequence: readonly LightState[]): void {
    this.scene.tweens.killTweensOf(this.signalPips);
    this.resetSignalLayout(sequence);
  }

  // Pips show only for slots the player has actually filled (up to two before
  // a match). Once the sliding window reaches three, the UI always shows the
  // last two. The third pip is reserved for the match animation; see
  // playSignalMatch.
  private resetSignalLayout(sequence: readonly LightState[]): void {
    const visible = sequence.slice(-2);
    const count = visible.length;
    this.signalLabel.setVisible(count > 0);
    const startX = this.signalCenterX - ((count - 1) * SIGNAL_PIP_SPACING) / 2;
    this.signalPips.forEach((pip, i) => {
      if (i >= count) {
        pip.setVisible(false);
        pip.setAlpha(1);
        return;
      }
      pip
        .setVisible(true)
        .setAlpha(1)
        .setPosition(startX + i * SIGNAL_PIP_SPACING, this.signalY)
        .setTexture(visible[i] === "on" ? "lit" : "unlit");
    });
  }

  // When a 3rd state enters the buffer without matching a known signal, the
  // two visible pips slide-shift so the player always sees the most-recent two:
  // pip[0] (oldest) fades out, pip[1] (middle) slides to the left slot, and
  // pip[2] fades in at the right slot showing the new 3rd state. `sequence`
  // is the full buffer after the 3rd state was added.
  animateShift(
    sequence: readonly LightState[],
    durationMs: number,
    onComplete?: () => void,
  ): void {
    const pos0 = this.signalCenterX - SIGNAL_PIP_SPACING / 2;
    const pos1 = this.signalCenterX + SIGNAL_PIP_SPACING / 2;
    const [p0, p1, p2] = this.signalPips;
    this.scene.tweens.killTweensOf(this.signalPips);

    this.signalLabel.setVisible(true);

    p2.setVisible(true)
      .setAlpha(0)
      .setPosition(pos1, this.signalY)
      .setTexture(sequence[sequence.length - 1] === "on" ? "lit" : "unlit");

    const halfMs = Math.max(80, Math.floor(durationMs / 2));
    this.scene.tweens.add({
      targets: p0,
      alpha: 0,
      duration: halfMs,
      ease: "Cubic.Out",
    });
    this.scene.tweens.add({
      targets: p1,
      x: pos0,
      duration: durationMs,
      ease: "Cubic.InOut",
    });
    this.scene.tweens.add({
      targets: p2,
      alpha: 1,
      delay: halfMs,
      duration: halfMs,
      ease: "Cubic.Out",
      onComplete: () => {
        this.resetSignalLayout(sequence);
        onComplete?.();
      },
    });
  }

  playSignalMatch(
    sequence: readonly LightState[],
    durationMs: number,
    onComplete?: () => void,
  ): void {
    const startX = this.signalCenterX - SIGNAL_PIP_SPACING;
    this.signalPips.forEach((pip, i) => {
      pip
        .setVisible(true)
        .setAlpha(1)
        .setPosition(startX + i * SIGNAL_PIP_SPACING, this.signalY)
        .setTexture(sequence[i] === "on" ? "lit" : "unlit");
    });
    const p2 = this.signalPips[2];
    this.scene.tweens.killTweensOf(p2);
    this.scene.tweens.add({
      targets: p2,
      alpha: 0.15,
      duration: Math.max(60, Math.floor(durationMs / 8)),
      yoyo: true,
      repeat: 3,
      ease: "Sine.InOut",
      onComplete: () => {
        p2.setAlpha(1);
        onComplete?.();
      },
    });
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
