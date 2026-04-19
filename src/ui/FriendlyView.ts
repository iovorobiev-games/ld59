import Phaser from "phaser";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import {
  FriendlyCharacter,
  SwipeDirection,
  TeachingStatus,
} from "../game/Encounter";
import { Signal, formatSignalBBCode } from "../game/Signal";
import { createBBCodeText } from "./fonts";
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

const KNOCK_SCALE = 1.04;
const KNOCK_HALF_DURATION = 90;
const KNOCK_COUNT = 3;

const TYPEWRITER_CHAR_MS = 35;
const SYNTH_EVERY_N_CHARS = 3;

const CHARACTER_TEXTURE: Record<FriendlyCharacter, string> = {
  wizard: "wizard",
  bandit: "rogue",
  fisher: "fisher",
  guard: "guard",
  ghost: "ghost",
  builder: "builder",
  kid: "kid",
  wife: "wife",
};

// Shorter characters drop below the cutout when centered on the adult line.
// Nudge them down so the top of the head sits inside the cutout.
const CHARACTER_Y_OFFSET: Partial<Record<FriendlyCharacter, number>> = {
  kid: 40,
  wife: 40,
};

const CONTAINER_DEPTH = 3;
// Text lives above the SignalListView paper so the typewriter output is never
// obscured by pinned paper content. Kept strictly less than BottomPanel so the
// panel still wins where they overlap (they don't, but keeps the ordering
// consistent with "everything UI sits above the paper").
export const FRIENDLY_TEXT_DEPTH = 6;

const TEXT_TOP = CUTOUT_BOTTOM + 60;
const TEXT_BOTTOM = DOOR_HEIGHT - 60;
const TEXT_CENTER_Y = (TEXT_TOP + TEXT_BOTTOM) / 2;
const TEXT_BG_WIDTH = DOOR_WIDTH - 80;
const TEXT_BG_HEIGHT = TEXT_BOTTOM - TEXT_TOP + 40;
const TEXT_BG_COLOR = 0x000000;
const TEXT_BG_ALPHA = 0.65;

export class FriendlyView {
  private scene: Phaser.Scene;
  private character: Phaser.GameObjects.Image;
  private door: Phaser.GameObjects.Image;
  private textBg: Phaser.GameObjects.Rectangle;
  private text: BBCodeText;
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

    const textWorldX = rightEdgeX - DOOR_WIDTH / 2;
    const textWorldY = bottomY - (DOOR_HEIGHT - TEXT_CENTER_Y);
    this.textBg = scene.add
      .rectangle(
        textWorldX,
        textWorldY,
        TEXT_BG_WIDTH,
        TEXT_BG_HEIGHT,
        TEXT_BG_COLOR,
        TEXT_BG_ALPHA,
      )
      .setOrigin(0.5)
      .setDepth(FRIENDLY_TEXT_DEPTH)
      .setVisible(false);

    this.text = createBBCodeText(scene, textWorldX, textWorldY, "", {
      fontSize: "36px",
      color: "#f5e6b8",
      align: "center",
      wordWrap: { width: DOOR_WIDTH - 120 },
    })
      .setOrigin(0.5)
      .setDepth(FRIENDLY_TEXT_DEPTH);
    this.typewriter = new TypewriterText(
      this.text,
      TYPEWRITER_CHAR_MS,
      (char, index) => this.onTypewriterChar(char, index),
    );

    container.add([backing, this.character, this.door, pointer]);
    container.setDepth(CONTAINER_DEPTH);
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
    offered: readonly [Signal, Signal],
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
      this.character.y = this.cutoutLocalY + (CHARACTER_Y_OFFSET[character] ?? 0);
      this.character.x = this.offscreenLocalX;
      this.character.setVisible(true);
      this.textBg.setVisible(true);
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
    offered: readonly [Signal, Signal],
    status: TeachingStatus,
    failureText: string,
  ): string {
    const header = status === "mistake" ? failureText : greeting;
    // First line (e.g. "Blinding Abyss offered new Spells.") reads as its own
    // beat; the remaining lines introduce the spell list below.
    const firstBreak = header.indexOf("\n");
    const lead = firstBreak === -1 ? header : header.slice(0, firstBreak);
    const intro = firstBreak === -1 ? "" : header.slice(firstBreak + 1);
    const offers = offered
      .map(
        (s) =>
          `${s.name}: ${formatSignalBBCode(s.sequence)}\n${s.description}`,
      )
      .join("\n\n");
    const body = intro ? `${intro}\n${offers}` : offers;
    return `${lead}\n\n${body}`;
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
    this.textBg.setVisible(false);
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
