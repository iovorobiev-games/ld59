import { SwipeDirection } from "./Encounter";

export type CombatTutorialPhase =
  | "intro"
  | "instruct_left"
  | "instruct_right"
  | "outro"
  | "bye"
  | "done";

const LINES: Record<CombatTutorialPhase, string> = {
  intro: "This monster attacks\nthe lighthouse.\nWe must keep it safe.",
  instruct_left:
    "Swipe left to protect\nthe lighthouse from\nthe damage.",
  instruct_right:
    "Great! Swipe right\nto damage the monster\nwith the light!",
  outro:
    "Alright, I think you can\ndo great on your own now.\nRemember our magic fuel signal!",
  bye: "Bye!",
  done: "",
};

export class CombatTutorial {
  private phase: CombatTutorialPhase = "intro";

  currentPhase(): CombatTutorialPhase {
    return this.phase;
  }

  isDone(): boolean {
    return this.phase === "done";
  }

  text(): string {
    return LINES[this.phase];
  }

  waitsForPlayer(): boolean {
    return this.phase === "instruct_left" || this.phase === "instruct_right";
  }

  expectedDirection(): SwipeDirection | null {
    if (this.phase === "instruct_left") return "left";
    if (this.phase === "instruct_right") return "right";
    return null;
  }

  handleSwipe(direction: SwipeDirection): void {
    if (this.phase === "instruct_left" && direction === "left") {
      this.phase = "instruct_right";
    } else if (this.phase === "instruct_right" && direction === "right") {
      this.phase = "outro";
    }
  }

  autoAdvance(): void {
    switch (this.phase) {
      case "intro":
        this.phase = "instruct_left";
        return;
      case "outro":
        this.phase = "bye";
        return;
      case "bye":
        this.phase = "done";
        return;
      default:
        return;
    }
  }
}
