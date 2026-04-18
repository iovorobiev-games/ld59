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

export interface AbilityIntent {
  icon: string;
  label: string;
  value?: number;
}

export interface Ability {
  readonly name: string;
  readonly intent: AbilityIntent;
  use(ctx: AbilityContext): AbilityEvent;
}

export class DealDamageAbility implements Ability {
  readonly name: string;
  readonly intent: AbilityIntent;

  constructor(private readonly damage: number) {
    this.name = `Deal ${damage}`;
    this.intent = { icon: "\u2694", label: "Attack", value: damage };
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
