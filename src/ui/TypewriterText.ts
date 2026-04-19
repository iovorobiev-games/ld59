import Phaser from "phaser";

export class TypewriterText {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private readonly charDelayMs: number;
  private readonly onChar?: (char: string, index: number) => void;
  private timer?: Phaser.Time.TimerEvent;
  private fullText = "";
  private charIndex = 0;
  private onComplete?: () => void;

  constructor(
    text: Phaser.GameObjects.Text,
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
    this.fullText = fullText;
    this.charIndex = 0;
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
    this.charIndex += 1;
    const char = this.fullText.charAt(this.charIndex - 1);
    this.text.setText(this.fullText.substring(0, this.charIndex));
    this.onChar?.(char, this.charIndex - 1);
    if (this.charIndex >= this.fullText.length) {
      this.cancel();
      this.onComplete?.();
      this.onComplete = undefined;
    }
  }
}
