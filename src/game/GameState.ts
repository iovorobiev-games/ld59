import { AbilityIntent } from "./Ability";
import { Card, CardSupplier } from "./Card";
import {
  Encounter,
  EncounterKind,
  FriendlyCharacter,
  FriendlyEncounter,
  FriendlyOutcome,
  FriendlyReward,
  SwipeDirection,
  UnfriendlyEncounter,
} from "./Encounter";
import {
  EncounterManager,
  buildDefaultDeck,
  pickAffordableFriendlyReplacement,
} from "./EncounterManager";

export type { SwipeDirection };

export type GamePhase = "player" | "transitioning" | "gameOver" | "victory";

export interface EncounterSnapshot {
  kind: EncounterKind;
  position: number;
  total: number;
  enemyName?: string;
  enemyHealth?: number;
  enemyMaxHealth?: number;
  enemyPendingReduction?: number;
  enemyIntent?: AbilityIntent;
  friendlySequence?: SwipeDirection[];
  friendlyProgress?: number;
  friendlyRewardText?: string;
  friendlyCharacter?: FriendlyCharacter;
  friendlyGreeting?: string;
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
  encounter: EncounterSnapshot | null;
}

export interface CardPlayEffect {
  damageDealt?: number;
  reductionAdded?: number;
  friendlyOutcome?: FriendlyOutcome;
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
  gameOutcome?: "lost" | "won";
}

export const INITIAL_SANITY = 10;
export const INITIAL_FUEL = 10;
export const INITIAL_LIGHTHOUSE_HEALTH = 10;
export const CARDS_PER_TURN = 3;

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

  constructor(deck?: Encounter[]) {
    this.current = this.supplier.draw();
    this.encounters = new EncounterManager(deck ?? buildDefaultDeck());
    this.ensureAffordableFriendly();
    this.rollIntentIfUnfriendly();
  }

  private rollIntentIfUnfriendly(): void {
    const enc = this.encounters.current();
    if (enc instanceof UnfriendlyEncounter) enc.enemy.rollIntent();
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
      cardsPerTurn: CARDS_PER_TURN,
      encounter: this.snapshotEncounter(),
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
      return {
        ...base,
        enemyName: enc.enemy.name,
        enemyHealth: enc.enemy.health,
        enemyMaxHealth: enc.enemy.maxHealth,
        enemyPendingReduction: enc.enemy.pendingReduction,
        enemyIntent: enc.enemy.intent?.intent,
      };
    }
    if (enc instanceof FriendlyEncounter) {
      return {
        ...base,
        friendlySequence: [...enc.sequence],
        friendlyProgress: enc.getProgress(),
        friendlyRewardText: enc.describeReward(),
        friendlyCharacter: enc.character,
        friendlyGreeting: enc.greeting,
      };
    }
    return base;
  }

  canPlayCard(direction: SwipeDirection): boolean {
    if (this.phase !== "player") return false;
    if (direction === "right" && this.fuel <= 0) return false;
    return true;
  }

  playCard(direction: SwipeDirection): PlayCardResult {
    if (this.phase !== "player") return { card: {} };

    if (direction === "left") {
      this.sanity = Math.max(0, this.sanity - 1);
      this.lightOn = false;
    } else {
      this.fuel = Math.max(0, this.fuel - 1);
      this.lightOn = true;
    }

    const enc = this.encounters.current();
    const card: CardPlayEffect = {};
    const result: PlayCardResult = { card };

    if (enc instanceof UnfriendlyEncounter) {
      if (direction === "right") {
        enc.enemy.takeDamage(1);
        card.damageDealt = 1;
      } else {
        enc.enemy.queueDamageReduction(1);
        card.reductionAdded = 1;
      }
    } else if (enc instanceof FriendlyEncounter) {
      const outcome = enc.notePlayed(direction);
      card.friendlyOutcome = outcome;
      if (outcome === "success") {
        this.applyReward(enc.reward);
        result.friendlyMessage = enc.successText;
        result.friendlyMessageKind = "success";
        result.friendlyReward = { ...enc.reward };
      } else if (outcome === "fail") {
        result.friendlyMessage = enc.failureText;
        result.friendlyMessageKind = "failure";
      }
    }

    this.cardsThisTurn += 1;
    this.current = this.supplier.draw();

    if (enc?.isResolved()) {
      result.encounterResolvedKind = enc.kind;
      this.cardsThisTurn = 0;
      this.phase = "transitioning";
      if (this.sanity <= 0 || this.health <= 0) {
        result.gameOutcome = "lost";
        this.phase = "gameOver";
      }
      return result;
    }

    if (this.cardsThisTurn >= CARDS_PER_TURN) {
      if (enc instanceof UnfriendlyEncounter) {
        const ev = enc.enemy.useIntent({
          source: enc.enemy,
          target: { takeDamage: (amt) => this.applyLighthouseDamage(amt) },
        });
        result.enemyAttack = ev;
        if (!enc.enemy.isDead()) enc.enemy.rollIntent();
      }
      this.cardsThisTurn = 0;
    }

    if (this.health <= 0 || this.sanity <= 0) {
      result.gameOutcome = "lost";
      this.phase = "gameOver";
    }

    return result;
  }

  advanceEncounter(): void {
    if (this.phase !== "transitioning") return;
    const next = this.encounters.advance();
    if (!next) {
      this.phase = "victory";
      return;
    }
    this.ensureAffordableFriendly();
    this.phase = "player";
    this.rollIntentIfUnfriendly();
  }

  private ensureAffordableFriendly(): void {
    const enc = this.encounters.current();
    if (!(enc instanceof FriendlyEncounter)) return;
    if (enc.rightCount() <= this.fuel) return;
    const replacement = pickAffordableFriendlyReplacement(this.fuel);
    this.encounters.replaceCurrent(replacement);
  }

  private applyReward(reward: FriendlyReward): void {
    if (reward.fuel) this.fuel += reward.fuel;
    if (reward.sanity) {
      this.sanity = Math.min(INITIAL_SANITY, this.sanity + reward.sanity);
    }
    if (reward.hp) {
      this.health = Math.min(INITIAL_LIGHTHOUSE_HEALTH, this.health + reward.hp);
    }
  }

  private applyLighthouseDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }
}
