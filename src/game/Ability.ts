import type { Enemy } from "./Enemy";

export interface PlayerTarget {
  takeDamage(amount: number): void;
  takeSanityDamage(amount: number): void;
  applyFuelSurcharge(amount: number): void;
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
  description: string;
}

export interface Ability {
  readonly name: string;
  getIntent(source: Enemy): AbilityIntent;
  use(ctx: AbilityContext): AbilityEvent;
}

export class DealDamageAbility implements Ability {
  readonly name: string;

  constructor(private readonly damage: number) {
    this.name = `Deal ${damage}`;
  }

  getIntent(source: Enemy): AbilityIntent {
    const total = this.damage + source.damageBonus;
    return {
      icon: "\u2694",
      label: "Attack",
      value: total,
      description: `Strikes the lighthouse for ${total} damage.`,
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    const raw = this.damage + ctx.source.damageBonus;
    if (raw > 0) ctx.target.takeDamage(raw);
    return { ability: this.name, rawDamage: raw, blocked: 0, dealt: raw };
  }
}

export class DealSanityDamageAbility implements Ability {
  readonly name: string;

  constructor(private readonly damage: number) {
    this.name = `Madden ${damage}`;
  }

  getIntent(): AbilityIntent {
    return {
      icon: "\u2726",
      label: "Madden",
      value: this.damage,
      description: `Erodes your sanity by ${this.damage}.`,
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    ctx.target.takeSanityDamage(this.damage);
    return {
      ability: this.name,
      rawDamage: this.damage,
      blocked: 0,
      dealt: this.damage,
    };
  }
}

export class VampiricSanityAbility implements Ability {
  readonly name: string;

  constructor(private readonly damage: number) {
    this.name = `Drain ${damage}`;
  }

  getIntent(): AbilityIntent {
    return {
      icon: "\u2665",
      label: "Drain",
      value: this.damage,
      description: `Drains ${this.damage} sanity and heals itself for ${this.damage}.`,
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    ctx.target.takeSanityDamage(this.damage);
    ctx.source.heal(this.damage);
    return {
      ability: this.name,
      rawDamage: this.damage,
      blocked: 0,
      dealt: this.damage,
    };
  }
}

export class DefendAbility implements Ability {
  readonly name: string;

  constructor(private readonly amount: number) {
    this.name = `Defend ${amount}`;
  }

  getIntent(): AbilityIntent {
    return {
      icon: "\u26e8",
      label: "Armor",
      value: this.amount,
      description: `Gains ${this.amount} armor, absorbing your next strikes.`,
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    ctx.source.addArmor(this.amount);
    return { ability: this.name, rawDamage: 0, blocked: 0, dealt: 0 };
  }
}

export class FogAbility implements Ability {
  readonly name = "Fog";

  getIntent(): AbilityIntent {
    return {
      icon: "\u2601",
      label: "Fog",
      value: 1,
      description: "Thickens the fog: light costs +1 fuel this encounter.",
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    ctx.target.applyFuelSurcharge(1);
    return { ability: this.name, rawDamage: 0, blocked: 0, dealt: 0 };
  }
}

export class RitualAbility implements Ability {
  readonly name = "Ritual";

  getIntent(): AbilityIntent {
    return {
      icon: "\u2727",
      label: "Ritual",
      value: 1,
      description: "Dark rite: permanently adds +1 damage to every future attack.",
    };
  }

  use(ctx: AbilityContext): AbilityEvent {
    ctx.source.addDamageBonus(1);
    return { ability: this.name, rawDamage: 0, blocked: 0, dealt: 0 };
  }
}
