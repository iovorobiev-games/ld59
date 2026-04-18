import { Ability, AbilityContext, AbilityEvent, AbilityIntent } from "./Ability";

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
  private damageBonusAmount = 0;

  constructor(config: EnemyConfig) {
    this.name = config.name;
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.maxHealth;
    this.abilities = config.abilities;
  }

  get health(): number {
    return this.currentHealth;
  }

  get damageBonus(): number {
    return this.damageBonusAmount;
  }

  isDead(): boolean {
    return this.currentHealth <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  addDamageBonus(amount: number): void {
    this.damageBonusAmount += amount;
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

  get intentDisplay(): AbilityIntent | null {
    return this.nextAbility ? this.nextAbility.getIntent(this) : null;
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
