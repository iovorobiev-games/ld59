import Phaser from "phaser";
import { GameState } from "../game/GameState";
import { LighthouseView } from "../ui/LighthouseView";
import { BottomPanel } from "../ui/BottomPanel";
import { CardView } from "../ui/CardView";

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lighthouse!: LighthouseView;
  private panel!: BottomPanel;
  private card!: CardView;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const halfH = height / 2;

    this.state = new GameState();

    this.lighthouse = new LighthouseView(this, width, halfH);
    this.panel = new BottomPanel(this, halfH, width, halfH);

    const cardHomeX = width / 2;
    const cardHomeY = halfH + halfH / 2;
    this.card = new CardView(
      this,
      cardHomeX,
      cardHomeY,
      (dir) => {
        if (dir === "right") return this.state.snapshot().fuel > 0;
        return true;
      },
      (dir) => {
        const snap = this.state.swipe(dir);
        this.lighthouse.setLight(snap.lightOn);
        if (dir === "right") this.lighthouse.flashLight();
        this.panel.setResources(snap.sanity, snap.fuel);
        this.panel.setSwipeHint(0, snap.fuel > 0);

        if (snap.isGameOver) {
          this.time.delayedCall(400, () => {
            this.scene.start("GameOverScene");
          });
          return;
        }
        this.card.show(snap.topCard);
      },
    );

    const initial = this.state.snapshot();
    this.lighthouse.setLight(initial.lightOn);
    this.lighthouse.setHealth(initial.lighthouseHealth, initial.lighthouseHealthMax);
    this.panel.setResources(initial.sanity, initial.fuel);
    this.card.show(initial.topCard);
  }

  update(): void {
    const snap = this.state.snapshot();
    this.panel.setSwipeHint(this.card.getDragOffset(), snap.fuel > 0);
  }
}
