import Phaser from "phaser";
import { GameState } from "../game/GameState";
import { LighthouseView } from "../ui/LighthouseView";
import { BottomPanel } from "../ui/BottomPanel";
import { CardView } from "../ui/CardView";
import { EnemyView } from "../ui/EnemyView";
import { FriendlyView } from "../ui/FriendlyView";
import { EncounterOverlay } from "../ui/EncounterOverlay";
import { TurnIndicator } from "../ui/TurnIndicator";

const ENEMY_ANCHOR_X = 420;
const OVERLAY_HOLD_MS = 1500;
const FRIENDLY_HOLD_MS = 1500;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lighthouse!: LighthouseView;
  private panel!: BottomPanel;
  private card!: CardView;
  private enemyView!: EnemyView;
  private friendlyView!: FriendlyView;
  private overlay!: EncounterOverlay;
  private turnIndicator!: TurnIndicator;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const halfH = height / 2;
    const groundY = halfH - 30;

    this.state = new GameState();

    this.lighthouse = new LighthouseView(this, width, halfH);
    this.enemyView = new EnemyView(this, ENEMY_ANCHOR_X, groundY);
    this.friendlyView = new FriendlyView(this, ENEMY_ANCHOR_X, groundY);
    this.panel = new BottomPanel(this, halfH, width, halfH);

    this.turnIndicator = new TurnIndicator(this, width - 260, 40);
    this.overlay = new EncounterOverlay(this, {
      dimX: 0,
      dimY: 0,
      dimWidth: width,
      dimHeight: halfH,
      textX: width / 2,
      textY: height / 2,
    });

    const cardHomeX = width / 2;
    const cardHomeY = halfH + halfH / 2;
    this.card = new CardView(
      this,
      cardHomeX,
      cardHomeY,
      (dir) => this.state.canPlayCard(dir),
      (dir) => this.handleCardPlayed(dir),
    );

    this.refreshViews();
    this.card.show(this.state.snapshot().topCard);
  }

  private handleCardPlayed(direction: "left" | "right"): void {
    const result = this.state.playCard(direction);
    const snap = this.state.snapshot();

    this.lighthouse.setLight(snap.lightOn);
    if (direction === "right") this.lighthouse.flashLight();
    this.panel.setResources(snap.sanity, snap.fuel);
    this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);

    if (result.card.damageDealt) this.enemyView.flashHit();
    if (snap.encounter?.kind === "unfriendly") {
      this.enemyView.setHealth(
        snap.encounter.enemyHealth ?? 0,
        snap.encounter.enemyMaxHealth ?? 1,
      );
      this.enemyView.setPendingReduction(snap.encounter.enemyPendingReduction ?? 0);
      this.enemyView.setIntent(snap.encounter.enemyIntent ?? null);
    } else if (snap.encounter?.kind === "friendly") {
      this.friendlyView.show(
        snap.encounter.friendlySequence ?? [],
        snap.encounter.friendlyProgress ?? 0,
        snap.encounter.friendlyRewardText ?? "",
      );
    }

    if (result.enemyAttack) {
      this.enemyView.flashAttack();
    }

    this.updateTurnIndicator();

    if (result.gameOutcome === "lost") {
      this.time.delayedCall(500, () => {
        this.scene.start("GameOverScene", { won: false });
      });
      return;
    }

    if (result.encounterResolvedKind === "unfriendly") {
      this.overlay.play("ABOMINATION EXPELLED", OVERLAY_HOLD_MS, () =>
        this.startNextEncounter(),
      );
      return;
    }

    if (result.encounterResolvedKind === "friendly") {
      const msg = result.friendlyMessage ?? "";
      this.overlay.play(msg, FRIENDLY_HOLD_MS, () => this.startNextEncounter());
      return;
    }

    this.card.show(snap.topCard);
  }

  private startNextEncounter(): void {
    this.state.advanceEncounter();
    const snap = this.state.snapshot();

    if (snap.phase === "victory") {
      this.scene.start("GameOverScene", { won: true });
      return;
    }

    this.refreshViews();
    this.card.show(snap.topCard);
  }

  private refreshViews(): void {
    const snap = this.state.snapshot();
    this.lighthouse.setLight(snap.lightOn);
    this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
    this.panel.setResources(snap.sanity, snap.fuel);

    const enc = snap.encounter;
    if (enc?.kind === "unfriendly") {
      this.friendlyView.hide();
      this.enemyView.show(
        enc.enemyName ?? "Abomination",
        enc.enemyHealth ?? 0,
        enc.enemyMaxHealth ?? 1,
      );
      this.enemyView.setPendingReduction(enc.enemyPendingReduction ?? 0);
      this.enemyView.setIntent(enc.enemyIntent ?? null);
    } else if (enc?.kind === "friendly") {
      this.enemyView.hide();
      this.friendlyView.show(
        enc.friendlySequence ?? [],
        enc.friendlyProgress ?? 0,
        enc.friendlyRewardText ?? "",
      );
    } else {
      this.enemyView.hide();
      this.friendlyView.hide();
    }

    this.updateTurnIndicator();
  }

  private updateTurnIndicator(): void {
    const snap = this.state.snapshot();
    this.turnIndicator.update({
      cardsPlayed: snap.cardsThisTurn,
      cardsPerTurn: snap.cardsPerTurn,
      encounterPosition: snap.encounter?.position ?? snap.encounter?.total ?? 0,
      encounterTotal: snap.encounter?.total ?? 0,
      kind: snap.encounter?.kind ?? null,
      friendlySequence: snap.encounter?.friendlySequence,
      friendlyProgress: snap.encounter?.friendlyProgress,
    });
  }

  update(): void {
    const snap = this.state.snapshot();
    this.panel.setSwipeHint(this.card.getDragOffset(), snap.fuel > 0);
  }
}
