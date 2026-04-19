import Phaser from "phaser";

// Minimal text surface — plain Phaser.Text and rexBBCodeText both satisfy this.
interface TypewriterTarget {
  scene: Phaser.Scene;
  setText(value: string): unknown;
}

// A "reveal unit" is what gets exposed on a single tick. For plain text that's
// a single character; for BBCode it's either one visible char or one whole tag
// (`[img=lit][/img]`, `[color=red]`, `[/color]` …). Tags count as 1 unit so
// the pacing matches what the player sees.
interface RevealUnit {
  raw: string;
  visibleChar: string; // empty for tag units
}

function tokenize(text: string): RevealUnit[] {
  const units: RevealUnit[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "[") {
      const close = text.indexOf("]", i);
      if (close !== -1) {
        units.push({ raw: text.substring(i, close + 1), visibleChar: "" });
        i = close + 1;
        continue;
      }
    }
    units.push({ raw: ch, visibleChar: ch });
    i += 1;
  }
  return units;
}

export class TypewriterText {
  private readonly scene: Phaser.Scene;
  private readonly text: TypewriterTarget;
  private readonly charDelayMs: number;
  private readonly onChar?: (char: string, index: number) => void;
  private timer?: Phaser.Time.TimerEvent;
  private units: RevealUnit[] = [];
  private revealed = "";
  private index = 0;
  private visibleIndex = 0;
  private onComplete?: () => void;

  constructor(
    text: TypewriterTarget,
    charDelayMs = 30,
    onChar?: (char: string, index: number) => void,
  ) {
    this.scene = text.scene;
    this.text = text;
    this.charDelayMs = charDelayMs;
    this.onChar = onChar;
  }

  play(fullText: string, onComplete?: () => void): void {
    this.cancel();
    this.units = tokenize(fullText);
    this.revealed = "";
    this.index = 0;
    this.visibleIndex = 0;
    this.onComplete = onComplete;
    this.text.setText("");
    this.timer = this.scene.time.addEvent({
      delay: this.charDelayMs,
      loop: true,
      callback: () => this.tick(),
    });
  }

  setImmediate(fullText: string): void {
    this.cancel();
    this.text.setText(fullText);
  }

  cancel(): void {
    this.timer?.remove();
    this.timer = undefined;
  }

  private tick(): void {
    const unit = this.units[this.index];
    if (!unit) {
      this.finish();
      return;
    }
    this.revealed += unit.raw;
    this.index += 1;
    this.text.setText(this.revealed);
    if (unit.visibleChar) {
      this.onChar?.(unit.visibleChar, this.visibleIndex);
      this.visibleIndex += 1;
    }
    if (this.index >= this.units.length) this.finish();
  }

  private finish(): void {
    this.cancel();
    this.onComplete?.();
    this.onComplete = undefined;
  }
}
