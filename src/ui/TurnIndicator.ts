import Phaser from "phaser";
import { EncounterKind, SwipeDirection } from "../game/Encounter";
import { createText } from "./fonts";

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
  private encounterText: Phaser.GameObjects.Text;
  private turnText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.encounterText = createText(scene, x, y, "", {
      fontSize: "28px",
      color: "#cccccc",
    }).setOrigin(0.5);

    this.turnText = createText(scene, x, y + 40, "", {
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
      this.turnText
        .setText(this.formatFriendly(seq, progress))
        .setColor("#ffd97a");
    } else if (state.kind === "unfriendly") {
      const remaining = Math.max(0, state.cardsPerTurn - state.cardsPlayed);
      this.turnText
        .setText(
          `Cards this turn: ${state.cardsPlayed} / ${state.cardsPerTurn}  (${remaining} left)`,
        )
        .setColor("#ffffff");
    } else if (state.kind === "story") {
      this.turnText.setText("Click or swipe to continue").setColor("#ffd97a");
    } else {
      this.turnText.setText("");
    }
  }

  private formatFriendly(sequence: SwipeDirection[], progress: number): string {
    return sequence
      .map((d, i) => {
        const token = d === "left" ? "OFF" : "ON";
        if (i < progress) return `·${token}·`;
        if (i === progress) return `[${token}]`;
        return token;
      })
      .join("  ");
  }

  setVisible(v: boolean): void {
    this.encounterText.setVisible(v);
    this.turnText.setVisible(v);
  }
}
