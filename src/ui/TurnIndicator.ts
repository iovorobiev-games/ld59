import Phaser from "phaser";
import { createText } from "./fonts";

export interface TurnIndicatorState {
  cardsPlayed: number;
  cardsPerTurn: number;
  encounterPosition: number;
  encounterTotal: number;
  kind: "friendly" | "unfriendly" | null;
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
    const remaining = Math.max(0, state.cardsPerTurn - state.cardsPlayed);
    this.encounterText.setText(
      `Encounter ${state.encounterPosition} / ${state.encounterTotal}`,
    );
    if (state.kind === "friendly") {
      this.turnText
        .setText("Play any 1 card to pass")
        .setColor("#ffd97a");
    } else if (state.kind === "unfriendly") {
      this.turnText
        .setText(`Cards this turn: ${state.cardsPlayed} / ${state.cardsPerTurn}  (${remaining} left)`)
        .setColor("#ffffff");
    } else {
      this.turnText.setText("");
    }
  }

  setVisible(v: boolean): void {
    this.encounterText.setVisible(v);
    this.turnText.setVisible(v);
  }
}
