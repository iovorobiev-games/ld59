import { Enemy } from "./Enemy";
import { LightState, SPELL_SEQUENCE_LENGTH, Spell, sequencesMatch } from "./Spell";

export type EncounterKind =
  | "friendly"
  | "unfriendly"
  | "story"
  | "tutorial"
  | "deferred";
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

export type FriendlyCharacter = "wizard" | "bandit" | "fisher";

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
  leftLabel?: string;
  rightLabel?: string;
  // Override for encounters whose outcome text depends on the current light
  // state (e.g. a "blink" sequence flips which direction finishes the blink
  // once the first toggle has happened).
  labelsForLight?: (lightOn: boolean) => FriendlyLabels;
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
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly labelsForLight?: (lightOn: boolean) => FriendlyLabels;
  private progress = 0;
  private failed = false;

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
    this.leftLabel = config.leftLabel ?? defaultLabelFor(this.sequence, "left");
    this.rightLabel = config.rightLabel ?? defaultLabelFor(this.sequence, "right");
    this.labelsForLight = config.labelsForLight;
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

  constructor(readonly id: EncounterId) {}

  isResolved(): boolean {
    return false;
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

  getSignal(): readonly LightState[] {
    return this.buffer;
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
