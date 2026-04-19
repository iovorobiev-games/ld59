import Phaser from "phaser";
import {
  FriendlyCharacter,
  SwipeDirection,
  TeachingStatus,
} from "../game/Encounter";
import { Spell, formatSignal } from "../game/Spell";
import { createText } from "./fonts";
import { TypewriterText } from "./TypewriterText";
import { Sfx } from "../audio/Sfx";

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
const SYNTH_EVERY_N_CHARS = 3;

// Fisher has no dedicated sprite yet — reuse bandit art until one is added.
const CHARACTER_TEXTURE: Record<FriendlyCharacter, string> = {
  wizard: "wizard",
  bandit: "bandit",
  fisher: "bandit",
};

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
    this.typewriter = new TypewriterText(
      this.text,
      TYPEWRITER_CHAR_MS,
      (char, index) => this.onTypewriterChar(char, index),
    );

    container.add([backing, this.character, this.door, pointer, this.text]);
    container.setDepth(3);
  }

  show(
    _sequence: SwipeDirection[],
    _progress: number,
    _rewardText: string,
    character: FriendlyCharacter = "wizard",
    greeting = "",
  ): void {
    this.render(character, greeting);
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

  setText(text: string): void {
    this.lastBody = text;
    this.typewriter.play(text);
  }

  showTutorial(text: string, onReady?: () => void): void {
    this.render("wizard", text, onReady);
  }

  private render(
    character: FriendlyCharacter,
    fullText: string,
    onReady?: () => void,
  ): void {
    if (character !== this.shownCharacter) {
      this.shownCharacter = character;
      this.character.setTexture(CHARACTER_TEXTURE[character]);
      this.character.x = this.offscreenLocalX;
      this.character.setVisible(true);
      this.typewriter.setImmediate("");
      this.lastBody = fullText;
      this.slideIn(() =>
        this.knock(() => this.typewriter.play(fullText, onReady)),
      );
      return;
    }
    if (fullText === this.lastBody) {
      onReady?.();
      return;
    }
    this.lastBody = fullText;
    this.typewriter.play(fullText, onReady);
  }

  hide(onComplete?: () => void): void {
    if (this.shownCharacter === null) {
      onComplete?.();
      return;
    }
    this.shownCharacter = null;
    this.lastBody = "";
    this.typewriter.setImmediate("");
    this.cancelKnock();
    this.slideOut(onComplete);
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

  private slideOut(onComplete?: () => void): void {
    this.slideTween?.stop();
    this.slideTween = this.scene.tweens.add({
      targets: this.character,
      x: this.offscreenLocalX,
      duration: SLIDE_DURATION,
      ease: "Cubic.Out",
      onComplete: () => {
        this.character.setVisible(false);
        onComplete?.();
      },
    });
  }

  private knock(onComplete: () => void): void {
    this.cancelKnock();
    this.door.setScale(1);
    Sfx.hitHurt(this.scene);
    this.knockTween = this.scene.tweens.add({
      targets: this.door,
      scale: KNOCK_SCALE,
      duration: KNOCK_HALF_DURATION,
      yoyo: true,
      repeat: KNOCK_COUNT - 1,
      ease: "Sine.easeInOut",
      onRepeat: () => Sfx.hitHurt(this.scene),
      onComplete: () => {
        this.door.setScale(1);
        onComplete();
      },
    });
  }

  private onTypewriterChar(char: string, index: number): void {
    if (/\s/.test(char)) return;
    if (index % SYNTH_EVERY_N_CHARS !== 0) return;
    Sfx.synth(this.scene);
  }

  private cancelKnock(): void {
    this.knockTween?.stop();
    this.knockTween = undefined;
    this.door.setScale(1);
  }
}
