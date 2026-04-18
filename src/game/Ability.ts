import type { Enemy } from "./Enemy";

export interface PlayerTarget {
  takeDamage(amount: number): void;
}

export interface AbilityContext {
  source: Enemy;
  target: PlayerTarget;
}

export interface AbilityEvent {
  ability: string;
  rawDamage: number;
  blocked: number;
  dealt: number;
}

export interface Ability {
  readonly name: string;
  use(ctx: AbilityContext): AbilityEvent;
}

export class DealDamageAbility implements Ability {
  readonly name: string;

  constructor(private readonly damage: number) {
    this.name = `Deal ${damage}`;
  }

  use(ctx: AbilityContext): AbilityEvent {
    const reduction = ctx.source.consumeDamageReduction(this.damage);
    const dealt = Math.max(0, this.damage - reduction);
    if (dealt > 0) ctx.target.takeDamage(dealt);
    return {
      ability: this.name,
      rawDamage: this.damage,
      blocked: reduction,
      dealt,
    };
  }
}
