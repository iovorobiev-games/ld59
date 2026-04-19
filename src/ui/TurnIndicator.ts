import Phaser from "phaser";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { EncounterKind, SwipeDirection } from "../game/Encounter";
import { BB_ICON_LIT, BB_ICON_UNLIT } from "../game/Signal";
import { createBBCodeText } from "./fonts";

export interface TurnIndicatorState {
  cardsPlayed: number;
  cardsPerTurn: number;
  encounterPosition: number;
  encounterTotal: number;
  kind: EncounterKind | null;
  friendlySequence?: SwipeDirection[];
  friendlyProgress?: number;
}

export class TurnIndicator {
  private encounterText: BBCodeText;
  private turnText: BBCodeText;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.encounterText = createBBCodeText(scene, x, y, "", {
      fontSize: "28px",
      color: "#cccccc",
    }).setOrigin(0.5);

    this.turnText = createBBCodeText(scene, x, y + 40, "", {
      fontSize: "28px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5);
  }

  update(state: TurnIndicatorState): void {
    this.encounterText.setText(
      `Encounter ${state.encounterPosition} / ${state.encounterTotal}`,
    );
    if (state.kind === "friendly") {
      const seq = state.friendlySequence ?? [];
      const progress = state.friendlyProgress ?? 0;
      this.turnText.setText(this.formatFriendly(seq, progress));
      this.turnText.setColor("#ffd97a");
    } else if (state.kind === "unfriendly") {
      const remaining = Math.max(0, state.cardsPerTurn - state.cardsPlayed);
      this.turnText.setText(
        `Cards this turn: ${state.cardsPlayed} / ${state.cardsPerTurn}  (${remaining} left)`,
      );
      this.turnText.setColor("#ffffff");
    } else if (state.kind === "story") {
      this.turnText.setText("Click or swipe to continue");
      this.turnText.setColor("#ffd97a");
    } else {
      this.turnText.setText("");
    }
  }

  private formatFriendly(sequence: SwipeDirection[], progress: number): string {
    // Done steps dim, the step due next highlights bright, upcoming stays default.
    return sequence
      .map((d, i) => {
        const icon = d === "left" ? BB_ICON_UNLIT : BB_ICON_LIT;
        if (i < progress) return `[color=#666666]${icon}[/color]`;
        if (i === progress) return `[color=#ffd97a]${icon}[/color]`;
        return icon;
      })
      .join("  ");
  }

  setVisible(v: boolean): void {
    this.encounterText.setVisible(v);
    this.turnText.setVisible(v);
  }
}
