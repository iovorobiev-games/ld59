import { DealDamageAbility } from "./Ability";
import { Enemy } from "./Enemy";
import {
  Encounter,
  FriendlyEncounter,
  FriendlyEncounterConfig,
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

  replaceCurrent(enc: Encounter): void {
    if (this.index < this.deck.length) this.deck[this.index] = enc;
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

const FRIENDLY_POOL: FriendlyEncounterConfig[] = [
  {
    sequence: ["left", "left", "left"],
    reward: { fuel: 3, hp: 2 },
    successText: "Bless this light.",
    failureText: "Ok then.",
  },
  {
    sequence: ["left", "left", "left"],
    reward: { fuel: 5 },
    successText: "Take the oil, keeper.",
    failureText: "Suit yourself.",
  },
  {
    sequence: ["right", "right", "right"],
    reward: { sanity: 5 },
    successText: "The song steadies you.",
    failureText: "No means no...",
  },
  {
    sequence: ["left", "left", "right"],
    reward: { fuel: 3, sanity: 3 },
    successText: "A fair trade.",
    failureText: "Not the dance I asked for.",
  },
  {
    sequence: ["left", "right", "right"],
    reward: { fuel: 3, sanity: 3 },
    successText: "A fair trade.",
    failureText: "Not the dance I asked for.",
  },
];

function cloneFriendly(cfg: FriendlyEncounterConfig): FriendlyEncounter {
  return new FriendlyEncounter({
    sequence: [...cfg.sequence],
    reward: { ...cfg.reward },
    successText: cfg.successText,
    failureText: cfg.failureText,
  });
}

export function buildDefaultDeck(): Encounter[] {
  return [
    new UnfriendlyEncounter(
      new Enemy({
        name: "Tentacle",
        maxHealth: 5,
        abilities: [
          new DealDamageAbility(1),
          new DealDamageAbility(2),
          new DealDamageAbility(3),
        ],
      }),
    ),
  ];
}

export function pickAffordableFriendlyReplacement(fuel: number): FriendlyEncounter {
  const affordable = FRIENDLY_POOL.filter((cfg) => {
    const rightCount = cfg.sequence.filter((d) => d === "right").length;
    return rightCount <= fuel;
  });
  const pool = affordable.length > 0 ? affordable : FRIENDLY_POOL.filter((cfg) =>
    cfg.sequence.every((d) => d === "left"),
  );
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return cloneFriendly(pick);
}
