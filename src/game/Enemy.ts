import { Ability, AbilityContext, AbilityEvent, AbilityIntent } from "./Ability";

export interface EnemyConfig {
  name: string;
  maxHealth: number;
  abilities: Ability[];
  spriteKey?: string;
}

export class Enemy {
  readonly name: string;
  readonly maxHealth: number;
  readonly spriteKey?: string;
  private currentHealth: number;
  private readonly abilities: Ability[];
  private armorAmount = 0;
  private nextAbility: Ability | null = null;
  private damageBonusAmount = 0;

  constructor(config: EnemyConfig) {
    this.name = config.name;
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.maxHealth;
    this.abilities = config.abilities;
    this.spriteKey = config.spriteKey;
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

  addArmor(amount: number): void {
    this.armorAmount += amount;
  }

  absorbDamage(incoming: number): number {
    const absorbed = Math.min(this.armorAmount, incoming);
    this.armorAmount -= absorbed;
    return absorbed;
  }

  resetArmor(): void {
    this.armorAmount = 0;
  }

  get armor(): number {
    return this.armorAmount;
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
