import { Enemy } from "./Enemy";
import {
  LightState,
  SIGNAL_SEQUENCE_LENGTH,
  Signal,
  SignalId,
  sequencesMatch,
} from "./Signal";

export type EncounterKind =
  | "friendly"
  | "unfriendly"
  | "story"
  | "tutorial"
  | "deferred"
  | "night";
export type SwipeDirection = "left" | "right";
export type EncounterId = string;

export interface Encounter {
  readonly kind: EncounterKind;
  isResolved(): boolean;
  getNextEncounterId?(): EncounterId | undefined;
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

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function defaultLabelFor(
  sequence: readonly SwipeDirection[],
  side: SwipeDirection,
): string {
  const agree = sequence[0] ?? "right";
  if (side === agree) return "Yes";
  return "No";
}

export function describeFriendlyReward(reward: FriendlyReward): string {
  const parts: string[] = [];
  if (reward.fuel) parts.push(`${signed(reward.fuel)} Fuel`);
  if (reward.sanity) parts.push(`${signed(reward.sanity)} Sanity`);
  if (reward.hp) parts.push(`${signed(reward.hp)} HP`);
  return parts.join("\n");
}

export type FriendlyOutcome = "progress" | "success" | "fail";

export type FriendlyCharacter =
  | "wizard"
  | "bandit"
  | "fisher"
  | "guard"
  | "ghost"
  | "builder"
  | "kid"
  | "wife";

export interface FriendlyLabels {
  left: string;
  right: string;
}

export interface FriendlyEncounterConfig {
  sequence: SwipeDirection[];
  reward: FriendlyReward;
  successText: string;
  failureText: string;
  character?: FriendlyCharacter;
  greeting?: string;
  progressTexts?: string[];
  shakeOnFinalStep?: boolean;
  nextOnSuccess?: EncounterId;
  nextOnFailure?: EncounterId;
  acceptAny?: boolean;
  failureReward?: FriendlyReward;
  // Filler friendlies set this true so chain-followup encounters are allowed
  // to replace them. Seeds (e.g. bandits_shipwreck), loot fishers, and chain
  // steps leave this false so the deck's mandatory beats survive.
  replaceable?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  // Override for encounters whose outcome text depends on the current light
  // state (e.g. a "blink" sequence flips which direction finishes the blink
  // once the first toggle has happened).
  labelsForLight?: (lightOn: boolean) => FriendlyLabels;
  // Story beats (night openers, final closer) skip the night progress indicator.
  offProgress?: boolean;
  // Flags to merge into GameState storyFlags when the encounter resolves.
  successFlags?: Record<string, boolean>;
  failureFlags?: Record<string, boolean>;
  // When set, success fires the moment this signal is cast in-encounter
  // (the SignalBook is a sliding window, so it may fire on fewer ONs than
  // the sequence length). OFF still fails on the spot.
  resolveOnSignal?: SignalId;
}

export interface FriendlyStepResult {
  outcome: FriendlyOutcome;
  progressText?: string;
  shake?: boolean;
}

export class FriendlyEncounter implements Encounter {
  readonly kind = "friendly" as const;
  readonly sequence: SwipeDirection[];
  readonly reward: FriendlyReward;
  readonly successText: string;
  readonly failureText: string;
  readonly character: FriendlyCharacter;
  readonly greeting: string;
  readonly progressTexts: string[];
  readonly shakeOnFinalStep: boolean;
  readonly nextOnSuccess?: EncounterId;
  readonly nextOnFailure?: EncounterId;
  readonly acceptAny: boolean;
  readonly failureReward: FriendlyReward;
  readonly replaceable: boolean;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly labelsForLight?: (lightOn: boolean) => FriendlyLabels;
  readonly offProgress: boolean;
  readonly successFlags: Record<string, boolean>;
  readonly failureFlags: Record<string, boolean>;
  readonly resolveOnSignal?: SignalId;
  private progress = 0;
  private failed = false;
  private succeededBySignal = false;

  constructor(config: FriendlyEncounterConfig) {
    this.sequence = config.sequence;
    this.reward = config.reward;
    this.successText = config.successText;
    this.failureText = config.failureText;
    this.character = config.character ?? "wizard";
    this.greeting = config.greeting ?? "";
    this.progressTexts = config.progressTexts ?? [];
    this.shakeOnFinalStep = config.shakeOnFinalStep ?? false;
    this.nextOnSuccess = config.nextOnSuccess;
    this.nextOnFailure = config.nextOnFailure;
    this.acceptAny = config.acceptAny ?? false;
    this.failureReward = config.failureReward ?? {};
    this.replaceable = config.replaceable ?? false;
    this.leftLabel = config.leftLabel ?? defaultLabelFor(this.sequence, "left");
    this.rightLabel = config.rightLabel ?? defaultLabelFor(this.sequence, "right");
    this.labelsForLight = config.labelsForLight;
    this.offProgress = config.offProgress ?? false;
    this.successFlags = config.successFlags ?? {};
    this.failureFlags = config.failureFlags ?? {};
    this.resolveOnSignal = config.resolveOnSignal;
  }

  // Called by GameState after SignalBook.recordAndMatch, before notePlayed.
  // If we're waiting on a specific signal and it just fired, arm the success
  // outcome so the next notePlayed() returns "success".
  noteSignalCast(id: SignalId | null | undefined): void {
    if (!this.resolveOnSignal || this.isResolved()) return;
    if (id === this.resolveOnSignal) this.succeededBySignal = true;
  }

  currentLabels(lightOn: boolean): FriendlyLabels {
    if (this.labelsForLight) return this.labelsForLight(lightOn);
    return { left: this.leftLabel, right: this.rightLabel };
  }

  // Reward text surfaced to the hint under the cost. Every swipe along the
  // agree path leads to the success reward; swipes off-path lead to failure.
  rewardFor(direction: SwipeDirection): string {
    if (this.isResolved()) return "";
    if (this.acceptAny) return describeFriendlyReward(this.reward);
    const expected = this.sequence[this.progress];
    if (!expected) return "";
    if (direction === expected) return describeFriendlyReward(this.reward);
    return describeFriendlyReward(this.failureReward);
  }

  // The "agree" direction is the one that makes progress toward success; the
  // other is "decline". For acceptAny encounters, left is conventionally agree.
  agreeDirection(): SwipeDirection {
    if (this.acceptAny) return "left";
    return this.sequence[this.progress] ?? this.sequence[0] ?? "right";
  }

  declineDirection(): SwipeDirection {
    return this.agreeDirection() === "left" ? "right" : "left";
  }

  notePlayed(direction: SwipeDirection): FriendlyStepResult {
    if (this.isResolved()) {
      return { outcome: this.failed ? "fail" : "success" };
    }
    if (this.resolveOnSignal) {
      if (direction === "left") {
        this.failed = true;
        return { outcome: "fail" };
      }
      const stepIdx = this.progress;
      if (this.progress < this.sequence.length) this.progress += 1;
      const progressText = this.progressTexts[stepIdx];
      const shake = this.shakeOnFinalStep && this.succeededBySignal;
      return {
        outcome: this.succeededBySignal ? "success" : "progress",
        progressText,
        shake,
      };
    }
    if (!this.acceptAny) {
      const expected = this.sequence[this.progress];
      if (direction !== expected) {
        this.failed = true;
        return { outcome: "fail" };
      }
    }
    const stepIdx = this.progress;
    this.progress += 1;
    const isLast = this.progress >= this.sequence.length;
    const progressText = this.progressTexts[stepIdx];
    const shake = this.shakeOnFinalStep && isLast;
    return {
      outcome: isLast ? "success" : "progress",
      progressText,
      shake,
    };
  }

  isResolved(): boolean {
    if (this.failed) return true;
    if (this.resolveOnSignal) return this.succeededBySignal;
    return this.progress >= this.sequence.length;
  }

  didFail(): boolean {
    return this.failed;
  }

  getProgress(): number {
    return this.progress;
  }

  describeReward(): string {
    return describeFriendlyReward(this.reward);
  }

  describeFailureReward(): string {
    return describeFriendlyReward(this.failureReward);
  }

  rightCount(): number {
    return this.sequence.filter((d) => d === "right").length;
  }

  getNextEncounterId(): EncounterId | undefined {
    if (!this.isResolved()) return undefined;
    return this.failed ? this.nextOnFailure : this.nextOnSuccess;
  }
}

export interface StoryConsequence {
  fuel?: number;
  sanity?: number;
  hp?: number;
}

export interface StoryEncounterConfig {
  text: string;
  character: FriendlyCharacter;
  consequence: StoryConsequence;
  nextOnSuccess?: EncounterId;
  leftLabel?: string;
  rightLabel?: string;
}

export class StoryEncounter implements Encounter {
  readonly kind = "story" as const;
  readonly text: string;
  readonly character: FriendlyCharacter;
  readonly consequence: StoryConsequence;
  readonly nextOnSuccess?: EncounterId;
  readonly leftLabel: string;
  readonly rightLabel: string;
  private resolved = false;

  constructor(config: StoryEncounterConfig) {
    this.text = config.text;
    this.character = config.character;
    this.consequence = config.consequence;
    this.nextOnSuccess = config.nextOnSuccess;
    this.leftLabel = config.leftLabel ?? "";
    this.rightLabel = config.rightLabel ?? "";
  }

  resolve(): void {
    this.resolved = true;
  }

  isResolved(): boolean {
    return this.resolved;
  }

  getNextEncounterId(): EncounterId | undefined {
    return this.resolved ? this.nextOnSuccess : undefined;
  }
}

export class DeferredEncounter implements Encounter {
  readonly kind = "deferred" as const;

  constructor(readonly id: EncounterId, readonly offProgress: boolean = false) {}

  isResolved(): boolean {
    return false;
  }
}

export type TeachingStatus = "idle" | "mistake" | "learned";

export interface TeachingEncounterConfig {
  offered: readonly [Signal, Signal];
  greeting?: string;
  failureText?: string;
}

const DEFAULT_TEACHING_GREETING =
  "I've glimpsed two new Spells.\nSignal which to learn:";
const DEFAULT_TEACHING_FAILURE =
  "Nah — signal A or signal B.";

export class TeachingEncounter implements Encounter {
  readonly kind = "friendly" as const;
  readonly character: FriendlyCharacter = "wizard";
  readonly offered: readonly [Signal, Signal];
  readonly greeting: string;
  readonly failureText: string;
  private buffer: LightState[] = [];
  private learnedSignal: Signal | null = null;
  private status: TeachingStatus = "idle";

  constructor(config: TeachingEncounterConfig) {
    this.offered = config.offered;
    this.greeting = config.greeting ?? DEFAULT_TEACHING_GREETING;
    this.failureText = config.failureText ?? DEFAULT_TEACHING_FAILURE;
  }

  notePlayed(state: LightState): TeachingStatus {
    this.buffer.push(state);
    if (this.buffer.length > SIGNAL_SEQUENCE_LENGTH) {
      this.buffer.splice(0, this.buffer.length - SIGNAL_SEQUENCE_LENGTH);
    }
    if (this.buffer.length < SIGNAL_SEQUENCE_LENGTH) {
      this.status = "idle";
      return "idle";
    }
    for (const signal of this.offered) {
      if (sequencesMatch(this.buffer, signal.sequence)) {
        this.learnedSignal = signal;
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

  getSignal(): readonly LightState[] {
    return this.buffer;
  }

  getLearned(): Signal | null {
    return this.learnedSignal;
  }

  isResolved(): boolean {
    return this.learnedSignal !== null;
  }
}

// Placeholder inserted at deck build time. GameState replaces it with a real
// TeachingEncounter generated from the player's current unknown signals & fuel,
// or swaps it for a regular FriendlyEncounter if teaching isn't feasible.
export class WizardTeachingPlaceholder implements Encounter {
  readonly kind = "friendly" as const;
  isResolved(): boolean {
    return false;
  }
}

// Marker inserted between nights. GameScene reacts to this by playing the
// full-screen "Night X" overlay; once dismissed, the scene resolves it and
// advances to the first encounter of the night.
export class NightEncounter implements Encounter {
  readonly kind = "night" as const;
  private resolved = false;

  constructor(readonly nightNumber: number) {}

  resolve(): void {
    this.resolved = true;
  }

  isResolved(): boolean {
    return this.resolved;
  }
}
