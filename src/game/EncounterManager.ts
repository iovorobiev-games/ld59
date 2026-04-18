import {
  DealDamageAbility,
  DealSanityDamageAbility,
  DefendAbility,
  FogAbility,
  RitualAbility,
  VampiricSanityAbility,
} from "./Ability";
import { Enemy } from "./Enemy";
import {
  Encounter,
  FriendlyEncounter,
  FriendlyEncounterConfig,
  UnfriendlyEncounter,
  WizardTeachingPlaceholder,
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
    character: "wizard",
    greeting: "Dim your lamp, keeper.",
  },
  {
    sequence: ["left", "left", "left"],
    reward: { fuel: 5 },
    successText: "Take the oil, keeper.",
    failureText: "Suit yourself.",
    character: "bandit",
    greeting: "Douse the light.\nI've got oil to spare.",
  },
  {
    sequence: ["right", "right", "right"],
    reward: { sanity: 5 },
    successText: "The song steadies you.",
    failureText: "No means no...",
    character: "wizard",
    greeting: "Shine, keeper.\nSing with me.",
  },
  {
    sequence: ["left", "left", "right"],
    reward: { fuel: 3, sanity: 3 },
    successText: "A fair trade.",
    failureText: "Not the dance I asked for.",
    character: "bandit",
    greeting: "Off, off,\nthen ON.",
  },
  {
    sequence: ["left", "right", "right"],
    reward: { fuel: 3, sanity: 3 },
    successText: "A fair trade.",
    failureText: "Not the dance I asked for.",
    character: "wizard",
    greeting: "Off, then\nON, ON.",
  },
];

function cloneFriendly(cfg: FriendlyEncounterConfig): FriendlyEncounter {
  return new FriendlyEncounter({
    sequence: [...cfg.sequence],
    reward: { ...cfg.reward },
    successText: cfg.successText,
    failureText: cfg.failureText,
    character: cfg.character,
    greeting: cfg.greeting,
  });
}

type EnemyFactory = () => UnfriendlyEncounter;

const ENEMY_POOL: EnemyFactory[] = [
  () =>
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
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Sea Ghosts",
        maxHealth: 5,
        abilities: [
          new DealDamageAbility(1),
          new DealDamageAbility(2),
          new DealSanityDamageAbility(2),
        ],
      }),
    ),
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Wings of Horror",
        maxHealth: 7,
        abilities: [
          new DealDamageAbility(1),
          new DealDamageAbility(2),
          new DealDamageAbility(3),
          new VampiricSanityAbility(1),
        ],
      }),
    ),
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Sky Wraith",
        maxHealth: 6,
        abilities: [
          new DefendAbility(2),
          new DealDamageAbility(1),
          new DealDamageAbility(2),
        ],
      }),
    ),
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Fog of Darkness",
        maxHealth: 7,
        abilities: [new DealDamageAbility(1), new FogAbility()],
      }),
    ),
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Sirens",
        maxHealth: 5,
        abilities: [new DealDamageAbility(1), new RitualAbility()],
      }),
    ),
  () =>
    new UnfriendlyEncounter(
      new Enemy({
        name: "Ghost Ship",
        maxHealth: 10,
        abilities: [
          new DefendAbility(2),
          new DefendAbility(3),
          new DealDamageAbility(2),
          new DealDamageAbility(3),
          new DealDamageAbility(4),
        ],
      }),
    ),
];

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FRIENDLY_COUNT_IN_DECK = 3;

export function buildDefaultDeck(): Encounter[] {
  const enemies: Encounter[] = ENEMY_POOL.map((make) => make());
  const friendlies: Encounter[] = [new WizardTeachingPlaceholder()];
  const friendlyPool = shuffle(FRIENDLY_POOL);
  for (let i = 0; i < FRIENDLY_COUNT_IN_DECK - 1; i++) {
    friendlies.push(cloneFriendly(friendlyPool[i % friendlyPool.length]));
  }
  return shuffle([...enemies, ...friendlies]);
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
