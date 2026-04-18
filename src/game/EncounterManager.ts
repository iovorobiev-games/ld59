import { DealDamageAbility } from "./Ability";
import { Enemy } from "./Enemy";
import {
  Encounter,
  FriendlyEncounter,
  UnfriendlyEncounter,
} from "./Encounter";

export class EncounterManager {
  private index = 0;

  constructor(private readonly deck: Encounter[]) {}

  current(): Encounter | null {
    return this.index < this.deck.length ? this.deck[this.index] : null;
  }

  advance(): Encounter | null {
    this.index += 1;
    return this.current();
  }

  isComplete(): boolean {
    return this.index >= this.deck.length;
  }

  remaining(): number {
    return Math.max(0, this.deck.length - this.index);
  }

  total(): number {
    return this.deck.length;
  }

  position(): number {
    return Math.min(this.index + 1, this.deck.length);
  }
}

export function buildDefaultDeck(): Encounter[] {
  return [
    new UnfriendlyEncounter(
      new Enemy({
        name: "Whisper",
        maxHealth: 3,
        abilities: [new DealDamageAbility(1)],
      }),
    ),
    new FriendlyEncounter("A wandering nun mutters a blessing."),
    new UnfriendlyEncounter(
      new Enemy({
        name: "Lurker",
        maxHealth: 6,
        abilities: [new DealDamageAbility(1), new DealDamageAbility(2)],
      }),
    ),
    new FriendlyEncounter("A drowned cat curls by the door."),
    new UnfriendlyEncounter(
      new Enemy({
        name: "Abomination",
        maxHealth: 10,
        abilities: [
          new DealDamageAbility(1),
          new DealDamageAbility(2),
          new DealDamageAbility(3),
        ],
      }),
    ),
    new UnfriendlyEncounter(
      new Enemy({
        name: "Leviathan",
        maxHealth: 15,
        abilities: [
          new DealDamageAbility(2),
          new DealDamageAbility(3),
          new DealDamageAbility(4),
        ],
      }),
    ),
  ];
}
