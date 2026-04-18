import { Enemy } from "./Enemy";

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

export interface FriendlyEncounterConfig {
  sequence: SwipeDirection[];
  reward: FriendlyReward;
  successText: string;
  failureText: string;
}

export class FriendlyEncounter implements Encounter {
  readonly kind = "friendly" as const;
  readonly sequence: SwipeDirection[];
  readonly reward: FriendlyReward;
  readonly successText: string;
  readonly failureText: string;
  private progress = 0;
  private failed = false;

  constructor(config: FriendlyEncounterConfig) {
    this.sequence = config.sequence;
    this.reward = config.reward;
    this.successText = config.successText;
    this.failureText = config.failureText;
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
