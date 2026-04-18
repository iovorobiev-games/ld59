import { Enemy } from "./Enemy";
import { LightState, SPELL_SEQUENCE_LENGTH, Spell, sequencesMatch } from "./Spell";

export type EncounterKind = "friendly" | "unfriendly";
export type SwipeDirection = "left" | "right";

export interface Encounter {
  readonly kind: EncounterKind;
  isResolved(): boolean;
}

export class UnfriendlyEncounter implements Encounter {
  readonly kind = "unfriendly" as const;

  constructor(readonly enemy: Enemy) {}

  isResolved(): boolean {
    return this.enemy.isDead();
  }
}

export interface FriendlyReward {
  fuel?: number;
  sanity?: number;
  hp?: number;
}

export type FriendlyOutcome = "progress" | "success" | "fail";

export type FriendlyCharacter = "wizard" | "bandit";

export interface FriendlyEncounterConfig {
  sequence: SwipeDirection[];
  reward: FriendlyReward;
  successText: string;
  failureText: string;
  character?: FriendlyCharacter;
  greeting?: string;
}

export class FriendlyEncounter implements Encounter {
  readonly kind = "friendly" as const;
  readonly sequence: SwipeDirection[];
  readonly reward: FriendlyReward;
  readonly successText: string;
  readonly failureText: string;
  readonly character: FriendlyCharacter;
  readonly greeting: string;
  private progress = 0;
  private failed = false;

  constructor(config: FriendlyEncounterConfig) {
    this.sequence = config.sequence;
    this.reward = config.reward;
    this.successText = config.successText;
    this.failureText = config.failureText;
    this.character = config.character ?? "wizard";
    this.greeting = config.greeting ?? "";
  }

  notePlayed(direction: SwipeDirection): FriendlyOutcome {
    if (this.isResolved()) return this.failed ? "fail" : "success";
    const expected = this.sequence[this.progress];
    if (direction !== expected) {
      this.failed = true;
      return "fail";
    }
    this.progress += 1;
    return this.progress >= this.sequence.length ? "success" : "progress";
  }

  isResolved(): boolean {
    return this.failed || this.progress >= this.sequence.length;
  }

  didFail(): boolean {
    return this.failed;
  }

  getProgress(): number {
    return this.progress;
  }

  describeSequence(): string {
    return this.sequence.map((d) => (d === "left" ? "OFF" : "ON")).join(" ");
  }

  describeReward(): string {
    const parts: string[] = [];
    if (this.reward.fuel) parts.push(`+${this.reward.fuel} Fuel`);
    if (this.reward.sanity) parts.push(`+${this.reward.sanity} Sanity`);
    if (this.reward.hp) parts.push(`+${this.reward.hp} HP`);
    return parts.join("\n");
  }

  rightCount(): number {
    return this.sequence.filter((d) => d === "right").length;
  }
}

export type TeachingStatus = "idle" | "mistake" | "learned";

export interface TeachingEncounterConfig {
  offered: readonly [Spell, Spell];
  greeting?: string;
  failureText?: string;
}

const DEFAULT_TEACHING_GREETING =
  "A blinding abyss offered new spells.\nSend me a signal and I shall cast one.";
const DEFAULT_TEACHING_FAILURE =
  "Nah — signal for spell A or signal for spell B.";

export class TeachingEncounter implements Encounter {
  readonly kind = "friendly" as const;
  readonly character: FriendlyCharacter = "wizard";
  readonly offered: readonly [Spell, Spell];
  readonly greeting: string;
  readonly failureText: string;
  private buffer: LightState[] = [];
  private learnedSpell: Spell | null = null;
  private status: TeachingStatus = "idle";

  constructor(config: TeachingEncounterConfig) {
    this.offered = config.offered;
    this.greeting = config.greeting ?? DEFAULT_TEACHING_GREETING;
    this.failureText = config.failureText ?? DEFAULT_TEACHING_FAILURE;
  }

  notePlayed(state: LightState): TeachingStatus {
    this.buffer.push(state);
    if (this.buffer.length > SPELL_SEQUENCE_LENGTH) {
      this.buffer.splice(0, this.buffer.length - SPELL_SEQUENCE_LENGTH);
    }
    if (this.buffer.length < SPELL_SEQUENCE_LENGTH) {
      this.status = "idle";
      return "idle";
    }
    for (const spell of this.offered) {
      if (sequencesMatch(this.buffer, spell.sequence)) {
        this.learnedSpell = spell;
        this.status = "learned";
        return "learned";
      }
    }
    this.status = "mistake";
    return "mistake";
  }

  currentStatus(): TeachingStatus {
    return this.status;
  }

  getLearned(): Spell | null {
    return this.learnedSpell;
  }

  isResolved(): boolean {
    return this.learnedSpell !== null;
  }
}

// Placeholder inserted at deck build time. GameState replaces it with a real
// TeachingEncounter generated from the player's current unknown spells & fuel,
// or swaps it for a regular FriendlyEncounter if teaching isn't feasible.
export class WizardTeachingPlaceholder implements Encounter {
  readonly kind = "friendly" as const;
  isResolved(): boolean {
    return false;
  }
}
