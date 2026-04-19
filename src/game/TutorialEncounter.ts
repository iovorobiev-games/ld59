import { Encounter, SwipeDirection } from "./Encounter";
import { LightState, sequencesMatch } from "./Signal";

export type TutorialPhase =
  | "greeting_1"
  | "greeting_2"
  | "instruct_swipe"
  | "wrong_left"
  | "after_right"
  | "instruct_signal"
  | "wrong_signal"
  | "after_cast"
  | "final"
  | "done";

const IGNITE_SIGNAL: readonly LightState[] = ["off", "on", "on"];

export interface TutorialSwipeOutcome {
  castIgnite: boolean;
}

export class TutorialEncounter implements Encounter {
  readonly kind = "tutorial" as const;
  private phase: TutorialPhase = "greeting_1";
  private signalBuffer: LightState[] = [];

  currentPhase(): TutorialPhase {
    return this.phase;
  }

  text(): string {
    switch (this.phase) {
      case "greeting_1":
        return "Ah, a new lighthouse keeper.";
      case "greeting_2":
        return "It is very easy to operate\nthe lighthouse.";
      case "instruct_swipe":
        return "Swipe the card right\nto ignite it.";
      case "wrong_left":
        return "No, not left. Right.\nStaying in the darkness\nconsumes your sanity.\nDon't do it. Unless necessary.";
      case "after_right":
        return "Good. It takes some fuel\nto keep the lights on.";
      case "instruct_signal":
        return "If you see the fuel\nis close to an end,\njust give me a signal:\n\"Off, On, On.\" Try it!";
      case "wrong_signal":
        return "No! That's not it.\nOff, On, On — that's for the fuel.\nTry again.";
      case "after_cast":
        return "Good, here is your fuel.";
      case "final":
        return "Wait, what's that sound?";
      case "done":
        return "";
    }
  }

  waitsForPlayer(): boolean {
    switch (this.phase) {
      case "instruct_swipe":
      case "wrong_left":
      case "instruct_signal":
      case "wrong_signal":
        return true;
      default:
        return false;
    }
  }

  showsRightHint(): boolean {
    return this.phase === "instruct_swipe" || this.phase === "wrong_left";
  }

  isSignalPhase(): boolean {
    return this.phase === "instruct_signal" || this.phase === "wrong_signal";
  }

  getSignal(): readonly LightState[] {
    return this.signalBuffer;
  }

  expectedDirection(): SwipeDirection | null {
    if (!this.isSignalPhase()) return null;
    const next = IGNITE_SIGNAL[this.signalBuffer.length];
    if (!next) return null;
    return next === "off" ? "left" : "right";
  }

  isResolved(): boolean {
    return this.phase === "done";
  }

  handleSwipe(direction: SwipeDirection): TutorialSwipeOutcome {
    switch (this.phase) {
      case "instruct_swipe":
      case "wrong_left":
        if (direction === "left") {
          this.phase = "wrong_left";
        } else {
          this.phase = "after_right";
        }
        return { castIgnite: false };
      case "instruct_signal":
      case "wrong_signal": {
        const state: LightState = direction === "left" ? "off" : "on";
        this.signalBuffer.push(state);
        if (this.signalBuffer.length > IGNITE_SIGNAL.length) {
          this.signalBuffer.splice(
            0,
            this.signalBuffer.length - IGNITE_SIGNAL.length,
          );
        }
        if (this.signalBuffer.length < IGNITE_SIGNAL.length) {
          return { castIgnite: false };
        }
        if (sequencesMatch(this.signalBuffer, IGNITE_SIGNAL)) {
          this.signalBuffer = [];
          this.phase = "after_cast";
          return { castIgnite: true };
        }
        this.signalBuffer = [];
        this.phase = "wrong_signal";
        return { castIgnite: false };
      }
      default:
        return { castIgnite: false };
    }
  }

  autoAdvance(): void {
    switch (this.phase) {
      case "greeting_1":
        this.phase = "greeting_2";
        return;
      case "greeting_2":
        this.phase = "instruct_swipe";
        return;
      case "after_right":
        this.phase = "instruct_signal";
        return;
      case "after_cast":
        this.phase = "final";
        return;
      case "final":
        this.phase = "done";
        return;
      default:
        return;
    }
  }
}
