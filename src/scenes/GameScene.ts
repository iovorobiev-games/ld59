import Phaser from "phaser";
import { GameState, GameStateSnapshot } from "../game/GameState";
import { LighthouseView } from "../ui/LighthouseView";
import { BottomPanel, PANEL_TOP_TRANSPARENT } from "../ui/BottomPanel";
import { CardView } from "../ui/CardView";
import { EnemyView } from "../ui/EnemyView";
import { FriendlyView } from "../ui/FriendlyView";
import { EncounterOverlay } from "../ui/EncounterOverlay";
import { NightOverlay } from "../ui/NightOverlay";
import { SignalListView } from "../ui/SignalListView";
import { playLightningStrike } from "../ui/LightningStrike";
import { TurnIndicator } from "../ui/TurnIndicator";
import { applyCrtPipeline } from "../pipelines/CrtPipeline";
import { Sfx } from "../audio/Sfx";
import { createText } from "../ui/fonts";
import { PlayCardResult, SignalCastEffect } from "../game/GameState";
import { SignalId, getSignal } from "../game/Signal";
import { buildDefaultDeck } from "../game/EncounterManager";
import {
  applyUrlResetFlag,
  isTutorialCompleted,
  markTutorialCompleted,
} from "../game/tutorialStore";

const ENEMY_ANCHOR_X = 420;
const OVERLAY_HOLD_MS = 1500;
const FRIENDLY_HOLD_MS = 2200;
const STORY_OVERLAY_HOLD_MS = 1400;
const TUTORIAL_HOLD_MS = 2000;
const TUTORIAL_FAREWELL_MS = 600;
const PANEL_HEIGHT = 474;
const DEFAULT_KNOWN_SIGNALS: SignalId[] = ["fuelUp"];
const SIGNAL_ANIM_MS = 900;
const SIGNAL_SHIFT_MS = 420;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private lighthouse!: LighthouseView;
  private panel!: BottomPanel;
  private card!: CardView;
  private enemyView!: EnemyView;
  private friendlyView!: FriendlyView;
  private overlay!: EncounterOverlay;
  private nightOverlay!: NightOverlay;
  private turnIndicator!: TurnIndicator;
  private signalList!: SignalListView;
  private dimOverlay!: Phaser.GameObjects.Rectangle;
  private prevLightOn = false;
  private storyClickHandler?: () => void;
  private tutorialTimer?: Phaser.Time.TimerEvent;
  private dialogueHintTimer?: Phaser.Time.TimerEvent;
  private dialogueHintAgree: "left" | "right" = "right";
  private dialogueHintActive = false;
  private dialogueHintIncludeDecline = true;
  private dialogueHintDelayMs = 10000;
  private animating = false;
  private nightIntroShown = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const panelTop = height - PANEL_HEIGHT;
    const groundY = panelTop - 30;

    applyCrtPipeline(this);
    Sfx.ensureAmbient(this);

    applyUrlResetFlag();
    const runTutorial = !isTutorialCompleted();
    this.state = new GameState({
      knownSignalIds: runTutorial ? [] : DEFAULT_KNOWN_SIGNALS,
      deck: buildDefaultDeck({ includeTutorial: runTutorial }),
    });

    this.lighthouse = new LighthouseView(this, width, panelTop, height);
    this.enemyView = new EnemyView(this, ENEMY_ANCHOR_X, groundY, height / 2, panelTop / 2);
    this.friendlyView = new FriendlyView(this, width, panelTop + PANEL_TOP_TRANSPARENT);
    this.panel = new BottomPanel(this, panelTop, width, PANEL_HEIGHT);

    this.turnIndicator = new TurnIndicator(this, width - 260, 40);

    this.signalList = new SignalListView(this, height, this.state.snapshot().knownSignalIds);

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
    this.nightOverlay = new NightOverlay(this);

    const cardHomeX = width / 2;
    const cardHomeY = panelTop + PANEL_HEIGHT / 2;
    this.input.on("pointerdown", () => this.handleCardInteractionStart());
    this.card = new CardView(
      this,
      cardHomeX,
      cardHomeY,
      (dir) => !this.animating && this.state.canPlayCard(dir),
      (dir) => this.handleCardPlayed(dir),
    );

    this.refreshViews();
    const initSnap = this.state.snapshot();
    this.prevLightOn = initSnap.lightOn;
    this.signalList.setKnown(initSnap.knownSignalIds);
    this.signalList.setSequence(initSnap.signalSequence);
    this.lighthouse.setSignal(initSnap.signalSequence);
    this.renderDeck(initSnap);
  }

  private renderDeck(snap: GameStateSnapshot): void {
    this.card.show(Math.max(0, snap.cardsPerTurn - snap.cardsThisTurn));
  }

  private handleCardPlayed(direction: "left" | "right"): void {
    const preSnap = this.state.snapshot();
    if (preSnap.encounter?.kind === "story") {
      this.handleStoryAction();
      return;
    }
    if (preSnap.encounter?.kind === "tutorial") {
      this.handleTutorialCard(direction);
      return;
    }
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
    if (result.card.friendlyShake) {
      this.cameras.main.shake(360, 0.012);
    }
    if (direction === "left") this.flashDim();
    if (snap.encounter?.kind === "unfriendly") {
      this.enemyView.setHealth(
        snap.encounter.enemyHealth ?? 0,
        snap.encounter.enemyMaxHealth ?? 1,
      );
      this.enemyView.setArmor(snap.encounter.enemyArmor ?? 0);
      this.lighthouse.setArmor(snap.encounter.lighthouseArmor ?? 0);
      this.enemyView.setIntent(snap.encounter.enemyIntent ?? null);
    } else if (snap.encounter?.kind === "friendly") {
      if (result.card.friendlyProgressText) {
        this.friendlyView.setText(result.card.friendlyProgressText);
      } else {
        this.showFriendly(snap.encounter);
      }
      if (snap.encounter.teachingOffered) {
        this.panel.setSignalProgress(snap.encounter.teachingSignal ?? []);
      } else {
        // Labels and the next agree direction may shift mid-encounter (e.g. a
        // blink quest flips once the first toggle lands).
        this.panel.setEffectHints(
          snap.encounter.outcomeLeftLabel ?? "",
          snap.encounter.outcomeRightLabel ?? "",
        );
        this.panel.setRewardHints(
          snap.encounter.outcomeLeftReward ?? "",
          snap.encounter.outcomeRightReward ?? "",
        );
        this.armDialogueHint(snap.encounter.friendlyAgreeDirection ?? "right");
      }
    }

    this.updateTurnIndicator();
    this.signalList.setKnown(snap.knownSignalIds);
    this.signalList.setSequence(snap.signalSequence);

    // Sliding-window case: a 3rd state was just added without matching. The
    // lighthouse animates the shift; signalCast and no-change cases fall
    // through to the direct setSignal.
    const shifted =
      !result.signalCast &&
      preSnap.signalSequence.length >= 2 &&
      snap.signalSequence.length === 3;
    if (!result.signalCast && !shifted) {
      this.lighthouse.setSignal(snap.signalSequence);
    }

    const afterLightning = () => {
      if (result.enemyAttack) {
        this.playEnemyAttackSequence(attackerName, () => {
          this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
          this.finishCardResolution(result, snap);
        });
        return;
      }
      this.finishCardResolution(result, snap);
    };

    const continueResolution = () => {
      if (result.lightningDamage !== undefined) {
        this.playLightningStrike(result.lightningDamage, snap, afterLightning);
        return;
      }
      afterLightning();
    };

    if (result.signalCast) {
      this.playSignalCastAnimation(
        result.signalCast,
        continueResolution,
        result.lightningDamage !== undefined,
      );
      return;
    }

    if (shifted) {
      this.animating = true;
      this.lighthouse.animateShift(snap.signalSequence, SIGNAL_SHIFT_MS, () => {
        this.animating = false;
        continueResolution();
      });
      return;
    }

    continueResolution();
  }

  private playSignalCastAnimation(
    cast: SignalCastEffect,
    onComplete: () => void,
    suppressLightningStrike = false,
  ): void {
    this.animating = true;
    this.signalList.flashSignal(cast.id, SIGNAL_ANIM_MS);
    this.lighthouse.playSignalMatch(getSignal(cast.id).sequence, SIGNAL_ANIM_MS);

    const banner = createText(
      this,
      this.scale.width / 2,
      this.scale.height / 3,
      `${cast.id.toUpperCase()}!`,
      {
        fontSize: "96px",
        color: "#ffd27a",
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

    if (cast.id === "lightning" && !suppressLightningStrike) {
      playLightningStrike({
        scene: this,
        target: this.lightningTarget(),
      });
    }

    this.time.delayedCall(SIGNAL_ANIM_MS, () => {
      this.animating = false;
      this.lighthouse.setSignal(this.state.snapshot().signalSequence);
      onComplete();
    });
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
      if (msg) this.friendlyView.setText(msg);
      this.time.delayedCall(FRIENDLY_HOLD_MS, () => {
        this.friendlyView.hide(() => this.startNextEncounter());
      });
      return;
    }

    if (result.encounterResolvedKind === "story") {
      this.time.delayedCall(STORY_OVERLAY_HOLD_MS, () => {
        this.friendlyView.hide(() => this.startNextEncounter());
      });
      return;
    }

    this.renderDeck(snap);
    if (snap.encounter?.kind === "unfriendly" && snap.encounter.combatTutorialPhase) {
      this.renderCombatTutorial();
    }
  }

  private handleStoryAction(): void {
    const preSnap = this.state.snapshot();
    if (preSnap.encounter?.kind !== "story") return;
    this.disarmStoryResolution();
    const preHealth = preSnap.lighthouseHealth;
    const preSanity = preSnap.sanity;
    const result = this.state.resolveStoryEncounter();
    const snap = this.state.snapshot();
    this.panel.setResources(snap.sanity, snap.fuel);
    this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
    if (snap.lighthouseHealth < preHealth) {
      this.lighthouse.playHit();
      this.cameras.main.shake(420, 0.014);
    } else if (snap.sanity < preSanity) {
      this.cameras.main.shake(260, 0.008);
    }
    this.updateTurnIndicator();
    this.finishCardResolution(result, snap);
  }

  private handleTutorialCard(direction: "left" | "right"): void {
    this.cancelTutorialTimer();
    this.card.stopSwipeHint();

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
    this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
    if (direction === "left") this.flashDim();
    this.updateTurnIndicator();
    this.signalList.setKnown(snap.knownSignalIds);
    this.signalList.setSequence(snap.signalSequence);
    this.lighthouse.setSignal(snap.signalSequence);

    const continueResolve = () => {
      if (result.encounterResolvedKind === "tutorial") {
        this.completeTutorial();
        return;
      }
      this.renderDeck(snap);
      this.renderTutorial();
    };

    if (result.signalCast) {
      this.playSignalCastAnimation(result.signalCast, continueResolve);
      return;
    }
    continueResolve();
  }

  private renderTutorial(): void {
    const snap = this.state.snapshot();
    const enc = snap.encounter;
    if (enc?.kind !== "tutorial") return;

    this.cancelTutorialTimer();
    this.cancelDialogueHint();
    const text = enc.tutorialText ?? "";
    const waits = enc.tutorialWaitsForPlayer ?? false;
    const firstSwipe = enc.tutorialShowRightHint ?? false;
    const signalPhase = !!enc.tutorialSignal;
    const expectedDir = enc.tutorialExpectedDirection;

    this.card.stopSwipeHint();
    if (firstSwipe) {
      this.panel.setEffectHints("", "Light Up");
      this.panel.setSignalProgress(null);
    } else if (signalPhase) {
      this.panel.setEffectHints("Send Off Signal", "Send On Signal");
      this.panel.setSignalProgress(enc.tutorialSignal ?? []);
    } else {
      this.panel.setEffectHints("", "");
      this.panel.setSignalProgress(null);
    }

    this.friendlyView.showTutorial(text, () => {
      if (waits) {
        // First tutorial swipe is right-only (decline path isn't a lesson
        // here); signal phases follow the next expected signal state.
        const agree = expectedDir ?? "right";
        this.armDialogueHint(agree, {
          includeDecline: !firstSwipe,
          delayMs: 3000,
        });
        return;
      }
      this.tutorialTimer = this.time.delayedCall(TUTORIAL_HOLD_MS, () =>
        this.advanceTutorial(),
      );
    });
  }

  private advanceTutorial(): void {
    const result = this.state.tutorialAutoAdvance();
    if (result.encounterResolvedKind === "tutorial") {
      this.completeTutorial();
      return;
    }
    this.renderTutorial();
  }

  private completeTutorial(): void {
    markTutorialCompleted();
    this.cancelTutorialTimer();
    this.card.stopSwipeHint();
    this.time.delayedCall(TUTORIAL_FAREWELL_MS, () => {
      this.friendlyView.hide(() => this.startNextEncounter());
    });
  }

  private cancelTutorialTimer(): void {
    this.tutorialTimer?.remove(false);
    this.tutorialTimer = undefined;
  }

  private renderCombatTutorial(): void {
    const snap = this.state.snapshot();
    const enc = snap.encounter;
    if (enc?.kind !== "unfriendly") return;
    const phase = enc.combatTutorialPhase;
    if (!phase) {
      this.cancelTutorialTimer();
      this.card.stopSwipeHint();
      this.friendlyView.hide();
      return;
    }

    this.cancelTutorialTimer();
    this.cancelDialogueHint();
    const text = enc.combatTutorialText ?? "";
    const waits = enc.combatTutorialWaitsForPlayer ?? false;
    const expectedDir = enc.combatTutorialExpectedDirection;
    this.card.stopSwipeHint();

    this.friendlyView.showTutorial(text, () => {
      if (waits) {
        if (expectedDir) this.armDialogueHint(expectedDir, { delayMs: 3000 });
        return;
      }
      this.tutorialTimer = this.time.delayedCall(TUTORIAL_HOLD_MS, () =>
        this.advanceCombatTutorial(),
      );
    });
  }

  private advanceCombatTutorial(): void {
    this.state.combatTutorialAutoAdvance();
    const snap = this.state.snapshot();
    this.panel.setResources(snap.sanity, snap.fuel);
    this.updateTurnIndicator();
    if (snap.encounter?.kind === "unfriendly" && !snap.encounter.combatTutorialPhase) {
      this.card.stopSwipeHint();
      this.friendlyView.hide();
      return;
    }
    this.renderCombatTutorial();
  }

  private armStoryResolution(): void {
    this.disarmStoryResolution();
    const handler = () => this.handleStoryAction();
    this.storyClickHandler = handler;
    this.input.once("pointerdown", handler);
  }

  private handleCardInteractionStart(): void {
    if (!this.dialogueHintActive) return;
    // Any pointer-down during a dialogue restarts the idle timer so the hint
    // doesn't fire while the player is engaging with the card.
    const includeDecline = this.dialogueHintIncludeDecline;
    const delayMs = this.dialogueHintDelayMs;
    this.cancelDialogueHint();
    this.armDialogueHint(this.dialogueHintAgree, { includeDecline, delayMs });
  }

  private armDialogueHint(
    agree: "left" | "right",
    opts: { includeDecline?: boolean; delayMs?: number } = {},
  ): void {
    this.cancelDialogueHint();
    this.dialogueHintAgree = agree;
    this.dialogueHintIncludeDecline = opts.includeDecline ?? true;
    this.dialogueHintDelayMs = opts.delayMs ?? 10000;
    this.dialogueHintActive = true;
    this.dialogueHintTimer = this.time.delayedCall(this.dialogueHintDelayMs, () =>
      this.playDialogueHintSequence(),
    );
  }

  private playDialogueHintSequence(): void {
    if (!this.dialogueHintActive) return;
    const decline: "left" | "right" =
      this.dialogueHintAgree === "right" ? "left" : "right";
    const scheduleNextIdle = () => {
      if (!this.dialogueHintActive) return;
      this.dialogueHintTimer = this.time.delayedCall(
        this.dialogueHintDelayMs,
        () => this.playDialogueHintSequence(),
      );
    };
    this.card.startSwipeHint(this.dialogueHintAgree, () => {
      if (!this.dialogueHintActive) return;
      if (this.dialogueHintIncludeDecline) {
        this.card.startSwipeHint(decline, scheduleNextIdle);
      } else {
        scheduleNextIdle();
      }
    });
  }

  private cancelDialogueHint(): void {
    this.dialogueHintActive = false;
    this.dialogueHintTimer?.remove(false);
    this.dialogueHintTimer = undefined;
    this.card.stopSwipeHint();
  }

  private disarmStoryResolution(): void {
    if (this.storyClickHandler) {
      this.input.off("pointerdown", this.storyClickHandler);
      this.storyClickHandler = undefined;
    }
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

  private playLightningStrike(
    damage: number,
    snap: GameStateSnapshot,
    onComplete: () => void,
  ): void {
    this.animating = true;
    const target = this.lightningTarget();
    if (damage > 0 && snap.encounter?.kind === "unfriendly") {
      const maxHp = snap.encounter.enemyMaxHealth ?? 1;
      const postHp = snap.encounter.enemyHealth ?? 0;
      this.enemyView.setHealth(postHp + damage, maxHp);
    }
    playLightningStrike({
      scene: this,
      target,
      onImpact: () => {
        if (damage > 0) {
          this.enemyView.flashHit(damage);
          if (snap.encounter?.kind === "unfriendly") {
            this.enemyView.setHealth(
              snap.encounter.enemyHealth ?? 0,
              snap.encounter.enemyMaxHealth ?? 1,
            );
          }
        }
      },
      onComplete: () => {
        this.animating = false;
        onComplete();
      },
    });
  }

  private lightningTarget(): { x: number; y: number } {
    const snap = this.state.snapshot();
    if (snap.encounter?.kind === "unfriendly") {
      return this.enemyView.getStrikeTarget();
    }
    return { x: ENEMY_ANCHOR_X, y: this.scale.height - PANEL_HEIGHT - 30 };
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
    this.renderDeck(snap);
  }

  private playNightIntro(nightNumber: number): void {
    // Skip the fade-in on the very first intro so the player doesn't see the
    // gameplay briefly before the overlay covers it; subsequent transitions
    // fade-in normally from the in-progress night.
    const instant = !this.nightIntroShown;
    this.nightIntroShown = true;
    this.nightOverlay.play(
      nightNumber,
      () => {
        this.state.acknowledgeNight();
        this.startNextEncounter();
      },
      { instant },
    );
  }

  private refreshViews(): void {
    const snap = this.state.snapshot();
    this.lighthouse.setLight(snap.lightOn);
    this.enemyView.setLight(snap.lightOn);
    this.lighthouse.setHealth(snap.lighthouseHealth, snap.lighthouseHealthMax);
    this.lighthouse.setSignal(snap.signalSequence);
    this.panel.setResources(snap.sanity, snap.fuel);
    this.disarmStoryResolution();
    this.cancelDialogueHint();
    this.panel.setSignalProgress(null);
    this.panel.setRewardHints("", "");
    const hasTutorial =
      snap.encounter?.kind === "tutorial" ||
      !!snap.encounter?.combatTutorialPhase;
    if (!hasTutorial) {
      this.cancelTutorialTimer();
      this.card.stopSwipeHint();
    }

    const enc = snap.encounter;
    if (enc?.kind === "unfriendly") {
      this.enemyView.show(
        enc.enemyName ?? "Abomination",
        enc.enemyHealth ?? 0,
        enc.enemyMaxHealth ?? 1,
        enc.enemySpriteKey ? { spriteKey: enc.enemySpriteKey } : undefined,
      );
      this.enemyView.setArmor(enc.enemyArmor ?? 0);
      this.lighthouse.setArmor(enc.lighthouseArmor ?? 0);
      this.enemyView.setIntent(enc.enemyIntent ?? null);
      this.panel.setCostVisible(true);
      this.panel.setEffectHints("+1 armor", "Deal 1 dmg");
      if (enc.combatTutorialPhase) {
        this.renderCombatTutorial();
      } else {
        this.friendlyView.hide();
      }
    } else if (enc?.kind === "friendly") {
      this.enemyView.hide();
      this.lighthouse.setArmor(0);
      this.showFriendly(enc);
      if (enc.teachingOffered) {
        this.panel.setCostVisible(true);
        this.panel.setEffectHints("Send Off Signal", "Send On Signal");
        this.panel.setRewardHints("", "");
        this.panel.setSignalProgress(enc.teachingSignal ?? []);
        this.armDialogueHint("right");
      } else {
        this.panel.setCostVisible(true);
        this.panel.setEffectHints(
          enc.outcomeLeftLabel ?? "",
          enc.outcomeRightLabel ?? "",
        );
        this.panel.setRewardHints(
          enc.outcomeLeftReward ?? "",
          enc.outcomeRightReward ?? "",
        );
        this.panel.setSignalProgress(null);
        this.armDialogueHint(enc.friendlyAgreeDirection ?? "right");
      }
    } else if (enc?.kind === "story") {
      this.enemyView.hide();
      this.lighthouse.setArmor(0);
      this.friendlyView.show(
        [],
        0,
        "",
        enc.storyCharacter ?? "wizard",
        enc.storyText ?? "",
      );
      this.panel.setCostVisible(false);
      this.panel.setEffectHints(
        enc.outcomeLeftLabel ?? "",
        enc.outcomeRightLabel ?? "",
      );
      this.armStoryResolution();
    } else if (enc?.kind === "tutorial") {
      this.enemyView.hide();
      this.lighthouse.setArmor(0);
      this.panel.setCostVisible(true);
      this.panel.setEffectHints("", "");
      this.renderTutorial();
    } else if (enc?.kind === "night") {
      this.enemyView.hide();
      this.friendlyView.hide();
      this.lighthouse.setArmor(0);
      this.panel.setCostVisible(false);
      this.panel.setEffectHints("", "");
      this.playNightIntro(enc.nightNumber ?? 1);
    } else {
      this.enemyView.hide();
      this.lighthouse.setArmor(0);
      this.friendlyView.hide();
      this.panel.setCostVisible(true);
      this.panel.setEffectHints("", "");
    }

    this.updateTurnIndicator();
  }

  private showFriendly(enc: NonNullable<GameStateSnapshot["encounter"]>): void {
    if (enc.teachingOffered) {
      this.friendlyView.showTeaching(
        enc.friendlyCharacter ?? "wizard",
        enc.friendlyGreeting ?? "",
        enc.teachingOffered,
        enc.teachingStatus ?? "idle",
        enc.teachingFailureText ?? "",
      );
      return;
    }
    this.friendlyView.show(
      enc.friendlySequence ?? [],
      enc.friendlyProgress ?? 0,
      enc.friendlyRewardText ?? "",
      enc.friendlyCharacter ?? "wizard",
      enc.friendlyGreeting ?? "",
    );
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
    this.panel.setSwipeHint(
      this.card.getDragOffset(),
      snap.fuel >= snap.lightFuelCost,
      snap.lightFuelCost,
    );
  }
}
