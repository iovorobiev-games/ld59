import { Enemy } from "./Enemy";

export type EncounterKind = "friendly" | "unfriendly";

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

export class FriendlyEncounter implements Encounter {
  readonly kind = "friendly" as const;
  private cardsPlayed = 0;

  constructor(readonly description: string) {}

  notePlayed(): void {
    this.cardsPlayed += 1;
  }

  isResolved(): boolean {
    return this.cardsPlayed >= 1;
  }
}
