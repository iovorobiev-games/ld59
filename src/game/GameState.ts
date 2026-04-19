import { AbilityIntent } from "./Ability";
import { Card, CardSupplier } from "./Card";
import {
  DeferredEncounter,
  Encounter,
  EncounterKind,
  FriendlyCharacter,
  FriendlyEncounter,
  FriendlyOutcome,
  FriendlyReward,
  NightEncounter,
  StoryConsequence,
  StoryEncounter,
  SwipeDirection,
  TeachingEncounter,
  TeachingStatus,
  UnfriendlyEncounter,
  WizardTeachingPlaceholder,
} from "./Encounter";
import {
  EncounterManager,
  buildDefaultDeck,
  createGrandkidEncounter,
  pickAffordableFriendlyReplacement,
} from "./EncounterManager";
import { createEncounterById } from "./EncounterRegistry";
import {
  LightState,
  Signal,
  SignalId,
  getSignal,
  signalFuelCost,
} from "./Signal";
import { SignalBook } from "./SignalBook";
import { TutorialEncounter, TutorialPhase } from "./TutorialEncounter";
import { CombatTutorial, CombatTutorialPhase } from "./CombatTutorial";

export type { SwipeDirection };

export type GamePhase = "player" | "transitioning" | "gameOver" | "victory";

export interface EncounterSnapshot {
  kind: EncounterKind;
  position: number;
  total: number;
  enemyName?: string;
  enemyHealth?: number;
  enemyMaxHealth?: number;
  enemyArmor?: number;
  enemySpriteKey?: string;
  lighthouseArmor?: number;
  enemyIntent?: AbilityIntent;
  friendlySequence?: SwipeDirection[];
  friendlyProgress?: number;
  friendlyRewardText?: string;
  friendlyCharacter?: FriendlyCharacter;
  friendlyGreeting?: string;
  friendlyAgreeDirection?: SwipeDirection;
  outcomeLeftLabel?: string;
  outcomeRightLabel?: string;
  outcomeLeftReward?: string;
  outcomeRightReward?: string;
  teachingOffered?: readonly [Signal, Signal];
  teachingStatus?: TeachingStatus;
  teachingFailureText?: string;
  teachingSignal?: readonly LightState[];
  storyText?: string;
  storyCharacter?: FriendlyCharacter;
  tutorialPhase?: TutorialPhase;
  tutorialText?: string;
  tutorialWaitsForPlayer?: boolean;
  tutorialShowRightHint?: boolean;
  tutorialSignal?: readonly LightState[];
  tutorialExpectedDirection?: SwipeDirection;
  combatTutorialPhase?: CombatTutorialPhase;
  combatTutorialText?: string;
  combatTutorialWaitsForPlayer?: boolean;
  combatTutorialExpectedDirection?: SwipeDirection;
  nightNumber?: number;
}

export interface GameStateSnapshot {
  sanity: number;
  fuel: number;
  lighthouseHealth: number;
  lighthouseHealthMax: number;
  lightOn: boolean;
  topCard: Card;
  phase: GamePhase;
  cardsThisTurn: number;
  cardsPerTurn: number;
  lightFuelCost: number;
  encounter: EncounterSnapshot | null;
  signalSequence: readonly LightState[];
  knownSignalIds: readonly SignalId[];
  nightProgress: { nightNumber: number; position: number; total: number } | null;
}

export interface SignalCastEffect {
  id: SignalId;
  fuelDelta?: number;
  sanityDelta?: number;
}

export interface CardPlayEffect {
  damageDealt?: number;
  reductionAdded?: number;
  friendlyOutcome?: FriendlyOutcome;
  friendlyProgressText?: string;
  friendlyShake?: boolean;
}

export interface EnemyAttackEffect {
  ability: string;
  rawDamage: number;
  blocked: number;
  dealt: number;
}

export interface PlayCardResult {
  card: CardPlayEffect;
  enemyAttack?: EnemyAttackEffect;
  encounterResolvedKind?: EncounterKind;
  friendlyMessage?: string;
  friendlyMessageKind?: "success" | "failure";
  friendlyReward?: FriendlyReward;
  storyResolved?: boolean;
  storyConsequence?: StoryConsequence;
  gameOutcome?: "lost" | "won";
  signalCast?: SignalCastEffect;
  lightningDamage?: number;
}

export const INITIAL_SANITY = 10;
export const INITIAL_FUEL = 10;
export const INITIAL_LIGHTHOUSE_HEALTH = 10;
export const CARDS_PER_TURN = 3;
export const BASE_LIGHT_FUEL_COST = 1;

export interface GameStateOpts {
  deck?: Encounter[];
  knownSignalIds?: readonly SignalId[];
}

function shuffle<T>(items: readonly T[]): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export class GameState {
  private sanity = INITIAL_SANITY;
  private fuel = INITIAL_FUEL;
  private health = INITIAL_LIGHTHOUSE_HEALTH;
  private lightOn = false;
  private supplier = new CardSupplier();
  private current: Card;
  private encounters: EncounterManager;
  private cardsThisTurn = 0;
  private phase: GamePhase = "player";
  private fuelSurcharge = 0;
  private signalBook: SignalBook;
  private stunNextAttack = false;
  private lighthouseDefence = 0;
  private lighthouseArmor = 0;
  private extraActionsThisTurn = 0;
  private extendPerTurn = 0;
  private fogApplied = false;
  private combatTutorial: CombatTutorial | null = null;
  private pendingCombatTutorial = false;
  private storyFlags: Record<string, boolean> = {};

  constructor(opts: GameStateOpts = {}) {
    this.current = this.supplier.draw();
    this.encounters = new EncounterManager(opts.deck ?? buildDefaultDeck());
    this.signalBook = new SignalBook(opts.knownSignalIds ?? []);
    this.materializeIfDeferred();
    this.ensureAffordableFriendly();
    if (this.encounters.current() instanceof NightEncounter) {
      this.phase = "transitioning";
    }
    this.rollIntentIfUnfriendly();
  }

  private rollIntentIfUnfriendly(): void {
    const enc = this.encounters.current();
    if (enc instanceof UnfriendlyEncounter) enc.enemy.rollIntent();
  }

  private materializeIfDeferred(): void {
    while (true) {
      const enc = this.encounters.current();
      if (!(enc instanceof DeferredEncounter)) return;
      const created = createEncounterById(enc.id, {
        lightOn: this.lightOn,
        storyFlags: this.storyFlags,
      });
      if (created) {
        this.encounters.replaceCurrent(created);
        return;
      }
      // Registry rejected this encounter (e.g. conditional story whose
      // prerequisite flag is unset). Remove it and re-check the new current.
      if (!this.encounters.removeCurrent()) return;
    }
  }

  private queueChainFollowup(resolved: Encounter): void {
    const nextId = resolved.getNextEncounterId?.();
    if (!nextId) return;
    this.encounters.replaceUpcomingFriendly(new DeferredEncounter(nextId));
  }

  snapshot(): GameStateSnapshot {
    return {
      sanity: this.sanity,
      fuel: this.fuel,
      lighthouseHealth: this.health,
      lighthouseHealthMax: INITIAL_LIGHTHOUSE_HEALTH,
      lightOn: this.lightOn,
      topCard: this.current,
      phase: this.phase,
      cardsThisTurn: this.cardsThisTurn,
      cardsPerTurn: CARDS_PER_TURN + this.extraActionsThisTurn,
      lightFuelCost: this.lightFuelCost,
      encounter: this.snapshotEncounter(),
      signalSequence: [...this.signalBook.sequence()],
      knownSignalIds: [...this.signalBook.knownIds()],
      nightProgress: this.encounters.nightProgress(),
    };
  }

  private snapshotEncounter(): EncounterSnapshot | null {
    const enc = this.encounters.current();
    if (!enc) return null;
    const base = {
      kind: enc.kind,
      position: this.encounters.position(),
      total: this.encounters.total(),
    };
    if (enc instanceof UnfriendlyEncounter) {
      const snap: EncounterSnapshot = {
        ...base,
        enemyName: enc.enemy.name,
        enemyHealth: enc.enemy.health,
        enemyMaxHealth: enc.enemy.maxHealth,
        enemyArmor: enc.enemy.armor,
        enemySpriteKey: enc.enemy.spriteKey,
        lighthouseArmor: this.lighthouseArmor,
        enemyIntent: enc.enemy.intentDisplay ?? undefined,
      };
      if (this.combatTutorial) {
        snap.combatTutorialPhase = this.combatTutorial.currentPhase();
        snap.combatTutorialText = this.combatTutorial.text();
        snap.combatTutorialWaitsForPlayer = this.combatTutorial.waitsForPlayer();
        const dir = this.combatTutorial.expectedDirection();
        if (dir) snap.combatTutorialExpectedDirection = dir;
      }
      return snap;
    }
    if (enc instanceof FriendlyEncounter) {
      const labels = enc.currentLabels(this.lightOn);
      return {
        ...base,
        friendlySequence: [...enc.sequence],
        friendlyProgress: enc.getProgress(),
        friendlyRewardText: enc.describeReward(),
        friendlyCharacter: enc.character,
        friendlyGreeting: enc.greeting,
        friendlyAgreeDirection: enc.agreeDirection(),
        outcomeLeftLabel: labels.left,
        outcomeRightLabel: labels.right,
        outcomeLeftReward: enc.rewardFor("left"),
        outcomeRightReward: enc.rewardFor("right"),
      };
    }
    if (enc instanceof TeachingEncounter) {
      return {
        ...base,
        friendlyCharacter: enc.character,
        friendlyGreeting: enc.greeting,
        teachingOffered: enc.offered,
        teachingStatus: enc.currentStatus(),
        teachingFailureText: enc.failureText,
        teachingSignal: enc.getSignal(),
      };
    }
    if (enc instanceof StoryEncounter) {
      return {
        ...base,
        storyText: enc.text,
        storyCharacter: enc.character,
        outcomeLeftLabel: enc.leftLabel,
        outcomeRightLabel: enc.rightLabel,
      };
    }
    if (enc instanceof NightEncounter) {
      return { ...base, nightNumber: enc.nightNumber };
    }
    if (enc instanceof TutorialEncounter) {
      const snap: EncounterSnapshot = {
        ...base,
        tutorialPhase: enc.currentPhase(),
        tutorialText: enc.text(),
        tutorialWaitsForPlayer: enc.waitsForPlayer(),
        tutorialShowRightHint: enc.showsRightHint(),
      };
      if (enc.isSignalPhase()) {
        snap.tutorialSignal = enc.getSignal();
        const dir = enc.expectedDirection();
        if (dir) snap.tutorialExpectedDirection = dir;
      }
      return snap;
    }
    return base;
  }

  private get lightFuelCost(): number {
    return BASE_LIGHT_FUEL_COST + this.fuelSurcharge;
  }

  canPlayCard(direction: SwipeDirection): boolean {
    if (this.phase !== "player") return false;
    const enc = this.encounters.current();
    if (enc instanceof StoryEncounter) return true;
    if (enc instanceof TutorialEncounter) {
      if (!enc.waitsForPlayer()) return false;
      if (direction === "right" && this.fuel < this.lightFuelCost) return false;
      return true;
    }
    if (this.combatTutorial && enc instanceof UnfriendlyEncounter) {
      const expected = this.combatTutorial.expectedDirection();
      if (!expected) return false;
      if (direction !== expected) return false;
      if (direction === "right" && this.fuel < this.lightFuelCost) return false;
      return true;
    }
    if (direction === "right" && this.fuel < this.lightFuelCost) return false;
    return true;
  }

  playCard(direction: SwipeDirection): PlayCardResult {
    if (this.phase !== "player") return { card: {} };

    const currentEnc = this.encounters.current();
    if (currentEnc instanceof StoryEncounter) {
      return this.resolveStory(currentEnc);
    }
    if (currentEnc instanceof TutorialEncounter) {
      return this.playTutorialCard(currentEnc, direction);
    }

    if (direction === "left") {
      this.sanity = Math.max(0, this.sanity - 1);
      this.lightOn = false;
    } else {
      this.fuel = Math.max(0, this.fuel - this.lightFuelCost);
      this.lightOn = true;
    }

    const enc = this.encounters.current();
    const card: CardPlayEffect = {};
    const result: PlayCardResult = { card };

    const matched = this.signalBook.recordAndMatch(this.lightOn ? "on" : "off");
    if (matched) result.signalCast = this.applySignalEffect(matched);

    if (enc instanceof UnfriendlyEncounter) {
      if (direction === "right") {
        const absorbed = enc.enemy.absorbDamage(1);
        const dealt = 1 - absorbed;
        if (dealt > 0) enc.enemy.takeDamage(dealt);
        card.damageDealt = dealt;
      } else {
        this.lighthouseArmor += 1;
        card.reductionAdded = 1;
      }
      if (matched?.id === "lightning" && !enc.enemy.isDead()) {
        const absorbed = enc.enemy.absorbDamage(2);
        const dealt = 2 - absorbed;
        if (dealt > 0) enc.enemy.takeDamage(dealt);
        result.lightningDamage = dealt;
      }
    } else if (enc instanceof FriendlyEncounter) {
      enc.noteSignalCast(matched?.id);
      const step = enc.notePlayed(direction);
      card.friendlyOutcome = step.outcome;
      if (step.progressText) card.friendlyProgressText = step.progressText;
      if (step.shake) card.friendlyShake = true;
      if (step.outcome === "success") {
        this.applyReward(enc.reward);
        this.mergeStoryFlags(enc.successFlags);
        result.friendlyMessage = enc.successText;
        result.friendlyMessageKind = "success";
        result.friendlyReward = { ...enc.reward };
      } else if (step.outcome === "fail") {
        this.applyReward(enc.failureReward);
        this.mergeStoryFlags(enc.failureFlags);
        result.friendlyMessage = enc.failureText;
        result.friendlyMessageKind = "failure";
        result.friendlyReward = { ...enc.failureReward };
      }
    } else if (enc instanceof TeachingEncounter) {
      const status = enc.notePlayed(this.lightOn ? "on" : "off");
      card.friendlyOutcome = status === "learned" ? "success" : "progress";
      if (status === "learned") {
        const learned = enc.getLearned()!;
        this.signalBook.learn(learned.id);
        result.friendlyMessage = `${learned.name} learned!`;
        result.friendlyMessageKind = "success";
        if (learned.id === "lightning") {
          this.encounters.replaceUpcomingFriendly(createGrandkidEncounter());
        }
      }
    }

    this.combatTutorial?.handleSwipe(direction);

    this.cardsThisTurn += 1;
    this.current = this.supplier.draw();

    if (enc?.isResolved()) {
      result.encounterResolvedKind = enc.kind;
      this.queueChainFollowup(enc);
      this.cardsThisTurn = 0;
      this.phase = "transitioning";
      if (this.sanity <= 0 || this.health <= 0) {
        result.gameOutcome = "lost";
        this.phase = "gameOver";
      }
      return result;
    }

    if (this.cardsThisTurn >= CARDS_PER_TURN + this.extraActionsThisTurn) {
      if (enc instanceof UnfriendlyEncounter) {
        enc.enemy.resetArmor();
        if (this.stunNextAttack) {
          this.stunNextAttack = false;
        } else {
          const ev = enc.enemy.useIntent({
            source: enc.enemy,
            target: {
              takeDamage: (amt) => this.applyLighthouseDamage(amt),
              takeSanityDamage: (amt) => this.applySanityDamage(amt),
              applyFuelSurcharge: (amt) => this.addFuelSurcharge(amt),
            },
          });
          result.enemyAttack = ev;
        }
        this.lighthouseArmor = 0;
        if (!enc.enemy.isDead()) enc.enemy.rollIntent();
      }
      this.cardsThisTurn = 0;
      this.extraActionsThisTurn = this.extendPerTurn;
    }

    if (this.health <= 0 || this.sanity <= 0) {
      result.gameOutcome = "lost";
      this.phase = "gameOver";
    }

    return result;
  }

  advanceEncounter(): void {
    if (this.phase !== "transitioning") return;
    this.fuelSurcharge = 0;
    this.fogApplied = false;
    this.stunNextAttack = false;
    this.lighthouseDefence = 0;
    this.lighthouseArmor = 0;
    this.extraActionsThisTurn = 0;
    this.extendPerTurn = 0;
    const next = this.encounters.advance();
    if (!next) {
      this.phase = "victory";
      return;
    }
    if (next instanceof NightEncounter) {
      // Keep phase as "transitioning" so the card is locked while the
      // "Night X" overlay plays. GameScene calls acknowledgeNight() +
      // advanceEncounter() again once the player dismisses the overlay.
      return;
    }
    this.materializeIfDeferred();
    this.ensureAffordableFriendly();
    this.phase = "player";
    const currentAfter = this.encounters.current();
    if (
      this.pendingCombatTutorial &&
      currentAfter instanceof UnfriendlyEncounter
    ) {
      this.combatTutorial = new CombatTutorial();
      this.pendingCombatTutorial = false;
    }
    this.rollIntentIfUnfriendly();
  }

  acknowledgeNight(): void {
    const enc = this.encounters.current();
    if (enc instanceof NightEncounter) enc.resolve();
    // Rest between nights: sanity and fuel refill to their starting caps.
    // The keeper sleeps through the day, recovering the mind and restocking
    // the lamp before the next night's horrors begin.
    this.sanity = INITIAL_SANITY;
    this.fuel = INITIAL_FUEL;
    this.phase = "transitioning";
  }

  resolveStoryEncounter(): PlayCardResult {
    if (this.phase !== "player") return { card: {} };
    const enc = this.encounters.current();
    if (!(enc instanceof StoryEncounter)) return { card: {} };
    return this.resolveStory(enc);
  }

  private playTutorialCard(
    enc: TutorialEncounter,
    direction: SwipeDirection,
  ): PlayCardResult {
    if (direction === "left") {
      this.sanity = Math.max(0, this.sanity - 1);
      this.lightOn = false;
    } else {
      this.fuel = Math.max(0, this.fuel - this.lightFuelCost);
      this.lightOn = true;
    }
    const outcome = enc.handleSwipe(direction);
    this.current = this.supplier.draw();
    const result: PlayCardResult = { card: {} };
    if (outcome.castFuelUp) {
      const delta = 3;
      this.fuel = Math.max(0, this.fuel + delta);
      this.signalBook.learn("fuelUp");
      result.signalCast = { id: "fuelUp", fuelDelta: delta };
    }
    if (enc.isResolved()) {
      result.encounterResolvedKind = "tutorial";
      this.phase = "transitioning";
      this.pendingCombatTutorial = true;
    }
    return result;
  }

  tutorialAutoAdvance(): PlayCardResult {
    const enc = this.encounters.current();
    if (!(enc instanceof TutorialEncounter)) return { card: {} };
    enc.autoAdvance();
    const result: PlayCardResult = { card: {} };
    if (enc.isResolved()) {
      result.encounterResolvedKind = "tutorial";
      this.phase = "transitioning";
      this.pendingCombatTutorial = true;
    }
    return result;
  }

  combatTutorialAutoAdvance(): void {
    if (!this.combatTutorial) return;
    this.combatTutorial.autoAdvance();
    if (this.combatTutorial.isDone()) {
      this.combatTutorial = null;
    }
  }

  private resolveStory(enc: StoryEncounter): PlayCardResult {
    enc.resolve();
    this.applyConsequence(enc.consequence);
    this.queueChainFollowup(enc);
    this.cardsThisTurn = 0;
    this.phase = "transitioning";
    const result: PlayCardResult = {
      card: {},
      encounterResolvedKind: "story",
      storyResolved: true,
      storyConsequence: { ...enc.consequence },
    };
    if (this.sanity <= 0 || this.health <= 0) {
      result.gameOutcome = "lost";
      this.phase = "gameOver";
    }
    return result;
  }

  private applyConsequence(c: StoryConsequence): void {
    if (c.fuel) this.fuel = Math.max(0, this.fuel + c.fuel);
    if (c.sanity) {
      this.sanity = Math.min(
        INITIAL_SANITY,
        Math.max(0, this.sanity + c.sanity),
      );
    }
    if (c.hp) {
      this.health = Math.min(
        INITIAL_LIGHTHOUSE_HEALTH,
        Math.max(0, this.health + c.hp),
      );
    }
  }

  private ensureAffordableFriendly(): void {
    const enc = this.encounters.current();
    if (enc instanceof WizardTeachingPlaceholder) {
      const teaching = this.buildTeachingEncounter();
      this.encounters.replaceCurrent(
        teaching ?? pickAffordableFriendlyReplacement(this.fuel),
      );
      return;
    }
    if (!(enc instanceof FriendlyEncounter)) return;
    if (enc.rightCount() <= this.fuel) return;
    const replacement = pickAffordableFriendlyReplacement(this.fuel);
    this.encounters.replaceCurrent(replacement);
  }

  private buildTeachingEncounter(): TeachingEncounter | null {
    const unknown = this.signalBook.unknownIds().map(getSignal);
    if (unknown.length < 2) return null;
    const affordable = shuffle(
      unknown.filter((s) => signalFuelCost(s) <= this.fuel),
    );
    if (affordable.length === 0) return null;
    const first = affordable[0];
    const rest = shuffle(unknown.filter((s) => s.id !== first.id));
    return new TeachingEncounter({ offered: [first, rest[0]] });
  }

  private mergeStoryFlags(flags: Record<string, boolean>): void {
    for (const key of Object.keys(flags)) this.storyFlags[key] = flags[key];
  }

  private applyReward(reward: FriendlyReward): void {
    if (reward.fuel) this.fuel = Math.max(0, this.fuel + reward.fuel);
    if (reward.sanity) {
      this.sanity = Math.max(
        0,
        Math.min(INITIAL_SANITY, this.sanity + reward.sanity),
      );
    }
    if (reward.hp) {
      this.health = Math.max(
        0,
        Math.min(INITIAL_LIGHTHOUSE_HEALTH, this.health + reward.hp),
      );
    }
  }

  private applyLighthouseDamage(amount: number): void {
    let remaining = amount;
    const armorAbsorbed = Math.min(this.lighthouseArmor, remaining);
    this.lighthouseArmor -= armorAbsorbed;
    remaining -= armorAbsorbed;
    const defenceAbsorbed = Math.min(this.lighthouseDefence, remaining);
    this.lighthouseDefence -= defenceAbsorbed;
    remaining -= defenceAbsorbed;
    this.health = Math.max(0, this.health - remaining);
  }

  private applySanityDamage(amount: number): void {
    this.sanity = Math.max(0, this.sanity - amount);
  }

  private addFuelSurcharge(amount: number): void {
    // Fog is the only surcharge source and should not stack within an encounter.
    if (this.fogApplied) return;
    this.fogApplied = true;
    this.fuelSurcharge += amount;
  }

  private applySignalEffect(signal: Signal): SignalCastEffect {
    switch (signal.id) {
      case "fuelUp": {
        const delta = 3;
        this.fuel += delta;
        return { id: signal.id, fuelDelta: delta };
      }
      case "calm": {
        const before = this.sanity;
        this.sanity = Math.min(INITIAL_SANITY, this.sanity + 2);
        return { id: signal.id, sanityDelta: this.sanity - before };
      }
      case "shroud":
        this.lighthouseDefence += 1;
        return { id: signal.id };
      case "confusion":
        this.stunNextAttack = true;
        return { id: signal.id };
      case "lightning":
        return { id: signal.id };
      case "extend":
        this.extendPerTurn += 1;
        this.extraActionsThisTurn += 1;
        return { id: signal.id };
    }
  }
}
