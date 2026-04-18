import Phaser from "phaser";
import { GameState, GameStateSnapshot } from "../game/GameState";
import { LighthouseView } from "../ui/LighthouseView";
import { BottomPanel, PANEL_TOP_TRANSPARENT } from "../ui/BottomPanel";
import { CardView } from "../ui/CardView";
import { EnemyView } from "../ui/EnemyView";
import { FriendlyView } from "../ui/FriendlyView";
import { EncounterOverlay } from "../ui/EncounterOverlay";
import { TurnIndicator } from "../ui/TurnIndicator";
import { applyCrtPipeline } from "../pipelines/CrtPipeline";
import { createText } from "../ui/fonts";
import { PlayCardResult } from "../game/GameState";

const ENEMY_ANCHOR_X = 420;
const OVERLAY_HOLD_MS = 1500;
const FRIENDLY_HOLD_MS = 1500;
const PANEL_HEIGHT = 474;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lighthouse!: LighthouseView;
  private panel!: BottomPanel;
  private card!: CardView;
  private enemyView!: EnemyView;
  private friendlyView!: FriendlyView;
  private overlay!: EncounterOverlay;
  private turnIndicator!: TurnIndicator;
  private dimOverlay!: Phaser.GameObjects.Rectangle;
  private prevLightOn = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const panelTop = height - PANEL_HEIGHT;
    const groundY = panelTop - 30;

    applyCrtPipeline(this);

    this.state = new GameState();

    this.lighthouse = new LighthouseView(this, width, panelTop, height);
    this.enemyView = new EnemyView(this, ENEMY_ANCHOR_X, groundY, height / 2);
    this.friendlyView = new FriendlyView(this, width, panelTop + PANEL_TOP_TRANSPARENT);
    this.panel = new BottomPanel(this, panelTop, width, PANEL_HEIGHT);

    this.turnIndicator = new TurnIndicator(this, width - 260, 40);

    this.dimOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0)
      .setDepth(100);
    this.overlay = new EncounterOverlay(this, {
      dimX: 0,
      dimY: 0,
      dimWidth: width,
      dimHeight: panelTop,
      textX: width / 2,
      textY: panelTop / 2,
    });

    const cardHomeX = width / 2;
    const cardHomeY = panelTop + PANEL_HEIGHT / 2;
    this.card = new CardView(
      this,
      cardHomeX,
      cardHomeY,
      (dir) => this.state.canPlayCard(dir),
      (dir) => this.handleCardPlayed(dir),
    );

    this.refreshViews();
    this.prevLightOn = this.state.snapshot().lightOn;
    this.card.show(this.state.snapshot().topCard);
  }

  private handleCardPlayed(direction: "left" | "right"): void {
    const preSnap = this.state.snapshot();
    const preAttackHealth = preSnap.lighthouseHealth;
    const attackerName = preSnap.encounter?.enemyName ?? "Abomination";

    const result = this.state.playCard(direction);
    const snap = this.state.snapshot();

    this.lighthouse.setLight(snap.lightOn);
    this.enemyView.setLight(snap.lightOn);
    if (direction === "right") this.lighthouse.flashLight();
    if (snap.lightOn && !this.prevLightOn) {
      this.cameras.main.shake(220, 0.004);
    }
    this.prevLightOn = snap.lightOn;
    this.panel.setResources(snap.sanity, snap.fuel);

    if (result.enemyAttack) {
      this.lighthouse.setHealth(preAttackHealth, snap.lighthouseHealthMax);
    } else {
      this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
    }

    if (result.card.damageDealt) {
      this.enemyView.flashHit(result.card.damageDealt);
      this.cameras.main.shake(220, 0.006);
    }
    if (direction === "left") this.flashDim();
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
        snap.encounter.friendlyCharacter ?? "wizard",
        snap.encounter.friendlyGreeting ?? "",
      );
    }

    this.updateTurnIndicator();

    if (result.enemyAttack) {
      this.playEnemyAttackSequence(attackerName, () => {
        this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
        this.finishCardResolution(result, snap);
      });
      return;
    }

    this.finishCardResolution(result, snap);
  }

  private finishCardResolution(result: PlayCardResult, snap: GameStateSnapshot): void {
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

  private playEnemyAttackSequence(enemyName: string, onComplete: () => void): void {
    const { width, height } = this.scale;
    const banner = createText(
      this,
      width / 2,
      height / 3,
      `${enemyName.toUpperCase()} ATTACKS`,
      {
        fontSize: "96px",
        color: "#ff5252",
        stroke: "#000000",
        strokeThickness: 8,
      },
    )
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(200);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 180,
      yoyo: true,
      hold: 320,
      onComplete: () => banner.destroy(),
    });

    this.time.delayedCall(420, () => {
      const impact = this.lighthouse.getImpactPoint();
      this.enemyView.playAttack(
        impact.x,
        () => {
          this.lighthouse.playHit();
          this.cameras.main.shake(420, 0.014);
        },
        onComplete,
      );
    });
  }

  private flashDim(): void {
    this.tweens.killTweensOf(this.dimOverlay);
    this.dimOverlay.setFillStyle(0x000000, 0);
    this.tweens.add({
      targets: this.dimOverlay,
      fillAlpha: 0.5,
      duration: 120,
      yoyo: true,
      hold: 60,
      ease: "Cubic.Out",
    });
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
    this.enemyView.setLight(snap.lightOn);
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
      this.panel.setEffectHints("-1 dmg to monster", "Deal 1 dmg");
    } else if (enc?.kind === "friendly") {
      this.enemyView.hide();
      this.friendlyView.show(
        enc.friendlySequence ?? [],
        enc.friendlyProgress ?? 0,
        enc.friendlyRewardText ?? "",
        enc.friendlyCharacter ?? "wizard",
        enc.friendlyGreeting ?? "",
      );
      this.panel.setEffectHints("", "");
    } else {
      this.enemyView.hide();
      this.friendlyView.hide();
      this.panel.setEffectHints("", "");
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
