import { Ability, AbilityContext, AbilityEvent } from "./Ability";

export interface EnemyConfig {
  name: string;
  maxHealth: number;
  abilities: Ability[];
}

export class Enemy {
  readonly name: string;
  readonly maxHealth: number;
  private currentHealth: number;
  private readonly abilities: Ability[];
  private damageReductionNext = 0;
  private nextAbility: Ability | null = null;

  constructor(config: EnemyConfig) {
    this.name = config.name;
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.maxHealth;
    this.abilities = config.abilities;
  }

  get health(): number {
    return this.currentHealth;
  }

  isDead(): boolean {
    return this.currentHealth <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
  }

  queueDamageReduction(amount: number): void {
    this.damageReductionNext += amount;
  }

  consumeDamageReduction(incomingDamage: number): number {
    const applied = Math.min(this.damageReductionNext, incomingDamage);
    this.damageReductionNext = 0;
    return applied;
  }

  get pendingReduction(): number {
    return this.damageReductionNext;
  }

  get intent(): Ability | null {
    return this.nextAbility;
  }

  rollIntent(): Ability {
    const idx = Math.floor(Math.random() * this.abilities.length);
    this.nextAbility = this.abilities[idx];
    return this.nextAbility;
  }

  useIntent(ctx: AbilityContext): AbilityEvent {
    const ability = this.nextAbility ?? this.rollIntent();
    this.nextAbility = null;
    return ability.use(ctx);
  }
}
