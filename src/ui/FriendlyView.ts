import Phaser from "phaser";
import {
  FriendlyCharacter,
  SwipeDirection,
  TeachingStatus,
} from "../game/Encounter";
import { Spell, formatSignal } from "../game/Spell";
import { createText } from "./fonts";
import { TypewriterText } from "./TypewriterText";

const DOOR_WIDTH = 680;
const DOOR_HEIGHT = 659;

const CUTOUT_LEFT = 88;
const CUTOUT_RIGHT = 604;
const CUTOUT_TOP = 82;
const CUTOUT_BOTTOM = 235;
const CUTOUT_CENTER_X = (CUTOUT_LEFT + CUTOUT_RIGHT) / 2;
const CUTOUT_CENTER_Y = (CUTOUT_TOP + CUTOUT_BOTTOM) / 2;

const POINTER_HEIGHT = 652;

const BACKING_COLOR = 0x0b0c06;
const SLIDE_DURATION = 420;
const OFFSCREEN_OFFSET = 320;

const KNOCK_SCALE = 0.96;
const KNOCK_HALF_DURATION = 90;
const KNOCK_COUNT = 3;

const TYPEWRITER_CHAR_MS = 35;

const TEXT_TOP = CUTOUT_BOTTOM + 60;
const TEXT_BOTTOM = DOOR_HEIGHT - 60;
const TEXT_CENTER_Y = (TEXT_TOP + TEXT_BOTTOM) / 2;

export class FriendlyView {
  private scene: Phaser.Scene;
  private character: Phaser.GameObjects.Image;
  private door: Phaser.GameObjects.Image;
  private text: Phaser.GameObjects.Text;
  private typewriter: TypewriterText;
  private slideTween?: Phaser.Tweens.Tween;
  private knockTween?: Phaser.Tweens.Tween;
  private shownCharacter: FriendlyCharacter | null = null;
  private lastBody = "";
  private readonly cutoutLocalX: number;
  private readonly cutoutLocalY: number;
  private readonly offscreenLocalX: number;

  constructor(scene: Phaser.Scene, rightEdgeX: number, bottomY: number) {
    this.scene = scene;
    const container = scene.add.container(rightEdgeX, bottomY);

    this.cutoutLocalX = -(DOOR_WIDTH - CUTOUT_CENTER_X);
    this.cutoutLocalY = -(DOOR_HEIGHT - CUTOUT_CENTER_Y);
    this.offscreenLocalX = this.cutoutLocalX + OFFSCREEN_OFFSET;

    const backing = scene.add
      .rectangle(0, 0, DOOR_WIDTH, DOOR_HEIGHT, BACKING_COLOR)
      .setOrigin(1, 1);

    this.character = scene.add
      .image(this.offscreenLocalX, this.cutoutLocalY, "wizard")
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.door = scene.add.image(0, 0, "door").setOrigin(1, 1);

    const pointerTopLocalY =
      -DOOR_HEIGHT + (DOOR_HEIGHT - POINTER_HEIGHT) / 2;
    const pointer = scene.add
      .image(-DOOR_WIDTH, pointerTopLocalY, "pointer")
      .setOrigin(1, 0);

    this.text = createText(
      scene,
      -DOOR_WIDTH / 2,
      -(DOOR_HEIGHT - TEXT_CENTER_Y),
      "",
      {
        fontSize: "44px",
        color: "#f5e6b8",
        align: "center",
        wordWrap: { width: DOOR_WIDTH - 120 },
      },
    ).setOrigin(0.5);
    this.typewriter = new TypewriterText(this.text, TYPEWRITER_CHAR_MS);

    container.add([backing, this.character, this.door, pointer, this.text]);
    container.setDepth(3);
  }

  show(
    sequence: SwipeDirection[],
    progress: number,
    rewardText: string,
    character: FriendlyCharacter = "wizard",
    greeting = "",
  ): void {
    this.render(character, this.buildText(greeting, sequence, progress, rewardText));
  }

  showTeaching(
    character: FriendlyCharacter,
    greeting: string,
    offered: readonly [Spell, Spell],
    status: TeachingStatus,
    failureText: string,
  ): void {
    this.render(
      character,
      this.buildTeachingText(greeting, offered, status, failureText),
    );
  }

  private render(character: FriendlyCharacter, fullText: string): void {
    if (character !== this.shownCharacter) {
      this.shownCharacter = character;
      this.character.setTexture(character);
      this.character.setVisible(true);
      this.typewriter.setImmediate("");
      this.lastBody = fullText;
      this.slideIn(() => this.knock(() => this.typewriter.play(fullText)));
      return;
    }
    if (fullText === this.lastBody) return;
    this.lastBody = fullText;
    this.typewriter.play(fullText);
  }

  hide(): void {
    if (this.shownCharacter === null) return;
    this.shownCharacter = null;
    this.lastBody = "";
    this.typewriter.setImmediate("");
    this.cancelKnock();
    this.slideOut();
  }

  private buildText(
    greeting: string,
    sequence: SwipeDirection[],
    progress: number,
    rewardText: string,
  ): string {
    const lines = [
      greeting,
      this.formatSequence(sequence, progress),
      rewardText,
    ].filter((s) => s && s.length > 0);
    return lines.join("\n");
  }

  private buildTeachingText(
    greeting: string,
    offered: readonly [Spell, Spell],
    status: TeachingStatus,
    failureText: string,
  ): string {
    const header = status === "mistake" ? failureText : greeting;
    const offers = offered
      .map((s) => `${s.name}: ${formatSignal(s.sequence)}`)
      .join("\n");
    return `${header}\n${offers}`;
  }

  private slideIn(onComplete: () => void): void {
    this.slideTween?.stop();
    this.character.x = this.offscreenLocalX;
    this.slideTween = this.scene.tweens.add({
      targets: this.character,
      x: this.cutoutLocalX,
      duration: SLIDE_DURATION,
      ease: "Cubic.Out",
      onComplete,
    });
  }

  private slideOut(): void {
    this.slideTween?.stop();
    this.slideTween = this.scene.tweens.add({
      targets: this.character,
      x: this.offscreenLocalX,
      duration: SLIDE_DURATION,
      ease: "Cubic.Out",
      onComplete: () => this.character.setVisible(false),
    });
  }

  private knock(onComplete: () => void): void {
    this.cancelKnock();
    this.door.setScale(1);
    this.knockTween = this.scene.tweens.add({
      targets: this.door,
      scale: KNOCK_SCALE,
      duration: KNOCK_HALF_DURATION,
      yoyo: true,
      repeat: KNOCK_COUNT - 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.door.setScale(1);
        onComplete();
      },
    });
  }

  private cancelKnock(): void {
    this.knockTween?.stop();
    this.knockTween = undefined;
    this.door.setScale(1);
  }

  private formatSequence(sequence: SwipeDirection[], progress: number): string {
    return sequence
      .map((d, i) => {
        const token = d === "left" ? "OFF" : "ON";
        if (i < progress) return `·${token}·`;
        if (i === progress) return `[${token}]`;
        return token;
      })
      .join("  ");
  }
}
