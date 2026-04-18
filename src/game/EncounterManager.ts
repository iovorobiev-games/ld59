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
import { createEncounterById } from "./EncounterRegistry";

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

  insertNext(enc: Encounter): void {
    this.deck.splice(this.index + 1, 0, enc);
  }

  insertRandomAfterCurrent(enc: Encounter): void {
    const lo = this.index + 1;
    const hi = this.deck.length + 1;
    const at = lo + Math.floor(Math.random() * Math.max(1, hi - lo));
    this.deck.splice(at, 0, enc);
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
    sequence: ["left"],
    reward: { sanity: 2 },
    successText: "Cheers, mate.\nHere's some moonshine for you.",
    failureText: "Fish won't bite with that glare...",
    character: "fisher",
    greeting:
      "You mind dim the light for a while?\nFish is skittish these days.",
  },
  {
    sequence: ["right", "right"],
    reward: { sanity: 4 },
    failureReward: { sanity: -1 },
    successText: "Ah, there she is.\nCheers, mate!",
    failureText: "Just try to ask me\nsomething in future...",
    character: "fisher",
    greeting:
      "My granddaughter is lost in the woods.\nPlease keep the lights on\nso she can find the way back.",
  },
];

function createLootFisher(): FriendlyEncounter {
  const fuel = 2 + Math.floor(Math.random() * 3);
  return new FriendlyEncounter({
    sequence: ["left"],
    acceptAny: true,
    reward: { fuel },
    successText: "Take your pick, keeper.",
    failureText: "",
    character: "fisher",
    greeting:
      "Here are the parts of\nthe abomination you slain.\nMaybe you can burn it for light.",
  });
}

function cloneFriendly(cfg: FriendlyEncounterConfig): FriendlyEncounter {
  return new FriendlyEncounter({
    sequence: [...cfg.sequence],
    reward: { ...cfg.reward },
    successText: cfg.successText,
    failureText: cfg.failureText,
    character: cfg.character,
    greeting: cfg.greeting,
    progressTexts: cfg.progressTexts ? [...cfg.progressTexts] : undefined,
    shakeOnFinalStep: cfg.shakeOnFinalStep,
    nextOnSuccess: cfg.nextOnSuccess,
    nextOnFailure: cfg.nextOnFailure,
    acceptAny: cfg.acceptAny,
    failureReward: cfg.failureReward ? { ...cfg.failureReward } : undefined,
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

const ENEMY_COUNT_IN_DECK = 3;
const FRIENDLY_COUNT_IN_DECK = ENEMY_COUNT_IN_DECK * 2;

export function buildDefaultDeck(): Encounter[] {
  const enemies: Encounter[] = shuffle(ENEMY_POOL)
    .slice(0, ENEMY_COUNT_IN_DECK)
    .map((make) => make());
  const friendlies: Encounter[] = [new WizardTeachingPlaceholder()];
  const shipwreck = createEncounterById("bandits_shipwreck", { lightOn: false });
  if (shipwreck) friendlies.push(shipwreck);
  const extra = Math.max(0, FRIENDLY_COUNT_IN_DECK - friendlies.length);
  const friendlyPool = shuffle(FRIENDLY_POOL);
  for (let i = 0; i < extra; i++) {
    friendlies.push(cloneFriendly(friendlyPool[i % friendlyPool.length]));
  }
  const shuffled = shuffle([...enemies, ...friendlies]);
  const deck: Encounter[] = [];
  for (const enc of shuffled) {
    deck.push(enc);
    if (enc instanceof UnfriendlyEncounter) deck.push(createLootFisher());
  }
  return deck;
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
