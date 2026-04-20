import {
  DealDamageAbility,
  DefendAbility,
  FogAbility,
  RitualAbility,
  VampiricSanityAbility,
} from "./Ability";
import { Enemy } from "./Enemy";
import {
  DeferredEncounter,
  Encounter,
  FriendlyEncounter,
  FriendlyEncounterConfig,
  FriendlyReward,
  NightEncounter,
  UnfriendlyEncounter,
  WizardTeachingPlaceholder,
} from "./Encounter";
import { createEncounterById } from "./EncounterRegistry";
import { TutorialEncounter } from "./TutorialEncounter";

export class EncounterManager {
  private index = 0;

  constructor(private readonly deck: Encounter[]) {}

  current(): Encounter | null {
    return this.index < this.deck.length ? this.deck[this.index] : null;
  }

  isLast(): boolean {
    return this.index === this.deck.length - 1;
  }

  advance(): Encounter | null {
    this.index += 1;
    return this.current();
  }

  replaceCurrent(enc: Encounter): void {
    if (this.index < this.deck.length) this.deck[this.index] = enc;
  }

  // Remove the current slot (used when a conditional DeferredEncounter
  // resolves to null). Returns true if there's a new current to consider.
  removeCurrent(): boolean {
    if (this.index >= this.deck.length) return false;
    this.deck.splice(this.index, 1);
    return this.index < this.deck.length;
  }

  insertNext(enc: Encounter): void {
    this.deck.splice(this.index + 1, 0, enc);
  }

  // Replace an upcoming filler friendly with `enc`. Tries the current night
  // first, then overflows into later nights. Falls back to insertion after
  // current if no replaceable slot remains (keeps chain progression alive
  // even after the last night's fillers are gone).
  replaceUpcomingFriendly(enc: Encounter): boolean {
    const groups: number[][] = [];
    let bucket: number[] = [];
    for (let i = this.index + 1; i < this.deck.length; i++) {
      const slot = this.deck[i];
      if (slot instanceof NightEncounter) {
        groups.push(bucket);
        bucket = [];
        continue;
      }
      if (slot instanceof FriendlyEncounter && slot.replaceable) {
        bucket.push(i);
      }
    }
    groups.push(bucket);
    for (const g of groups) {
      if (g.length === 0) continue;
      const at = g[Math.floor(Math.random() * g.length)];
      this.deck[at] = enc;
      return true;
    }
    this.deck.splice(this.index + 1, 0, enc);
    return false;
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

  // Progress within the current night. Loot-fisher slots (the encounter
  // inserted right after an enemy) don't get their own notch — the bar still
  // shows the enemy's notch while the player is on the loot follow-up.
  // Story beats marked `offProgress` (night openers, the Night 3 finale)
  // also skip the count so the bar reflects the combat/filler arc.
  // Returns null when the player is pre-Night 1 (e.g. tutorial slots).
  nightProgress(): { nightNumber: number; position: number; total: number } | null {
    let markerIdx = -1;
    for (let i = Math.min(this.index, this.deck.length - 1); i >= 0; i--) {
      if (this.deck[i] instanceof NightEncounter) {
        markerIdx = i;
        break;
      }
    }
    if (markerIdx < 0) return null;
    const marker = this.deck[markerIdx] as NightEncounter;
    let total = 0;
    let position = 0;
    for (let i = markerIdx + 1; i < this.deck.length; i++) {
      if (this.deck[i] instanceof NightEncounter) break;
      const slot = this.deck[i];
      const isPostEnemyFollowup = this.deck[i - 1] instanceof UnfriendlyEncounter;
      const isOffProgress =
        (slot instanceof FriendlyEncounter && slot.offProgress) ||
        (slot instanceof DeferredEncounter && slot.offProgress);
      const counts = !isPostEnemyFollowup && !isOffProgress;
      if (counts) total += 1;
      if (i <= this.index && counts) position = total;
    }
    return { nightNumber: marker.nightNumber, position, total };
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
    leftLabel: "Dim",
    rightLabel: "Refuse",
    replaceable: true,
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
    leftLabel: "Refuse",
    rightLabel: "Help",
    replaceable: true,
  },
  {
    sequence: ["left"],
    reward: { hp: 2 },
    successText: "All done!",
    failureText: "You know better...",
    character: "builder",
    greeting:
      "We come to fix the lighthouse.\nIt shouldn't be working during maintenance.\nDim the lights, and we begin.",
    leftLabel: "Dim",
    rightLabel: "Refuse",
    replaceable: true,
  },
];

export function createGrandkidEncounter(): FriendlyEncounter {
  return new FriendlyEncounter({
    sequence: ["right", "right", "right"],
    reward: { sanity: 4 },
    successText: "Hahaha! So cool!",
    failureText: "boo...",
    character: "kid",
    greeting:
      "Grandpa says you can summon\nlightning with your lighthouse!\nShow me!",
    leftLabel: "Hide",
    rightLabel: "Show",
    resolveOnSignal: "lightning",
  });
}

function createLootFisher(): FriendlyEncounter {
  const fuel = 2 + Math.floor(Math.random() * 3);
  const hp = Math.floor(Math.random() * 3);
  const reward: FriendlyReward = hp > 0 ? { fuel, hp } : { fuel };
  return new FriendlyEncounter({
    sequence: ["left"],
    acceptAny: true,
    reward,
    successText: "Take your pick, keeper.",
    failureText: "",
    character: "fisher",
    greeting:
      "Here are the parts of\nthe abomination you slain.\nMaybe you can burn it for light.",
    leftLabel: "Take",
    rightLabel: "Take",
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
    replaceable: cfg.replaceable,
    leftLabel: cfg.leftLabel,
    rightLabel: cfg.rightLabel,
    labelsForLight: cfg.labelsForLight,
    resolveOnSignal: cfg.resolveOnSignal,
  });
}

type EnemyFactory = () => UnfriendlyEncounter;

function createTentacleEncounter(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Tentacle",
      maxHealth: 5,
      spriteKey: "tentacle",
      abilities: [
        new DealDamageAbility(1),
        new DealDamageAbility(2),
        new DealDamageAbility(3),
      ],
    }),
  );
}

function createWingsOfHorror(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Wings of Horror",
      maxHealth: 7,
      spriteKey: "winged_horror",
      abilities: [
        new DealDamageAbility(1),
        new DealDamageAbility(2),
        new DealDamageAbility(3),
        new VampiricSanityAbility(1),
      ],
    }),
  );
}

function createSkyWraith(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Sky Wraith",
      maxHealth: 6,
      spriteKey: "skywraith",
      abilities: [
        new DefendAbility(2),
        new DealDamageAbility(1),
        new DealDamageAbility(2),
      ],
    }),
  );
}

function createFogOfDarkness(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Fog of Darkness",
      maxHealth: 7,
      spriteKey: "fog",
      abilities: [new DealDamageAbility(1), new FogAbility()],
    }),
  );
}

function createSirens(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Sirens",
      maxHealth: 5,
      spriteKey: "siren",
      abilities: [new DealDamageAbility(1), new RitualAbility()],
    }),
  );
}

function createGhostShip(): UnfriendlyEncounter {
  return new UnfriendlyEncounter(
    new Enemy({
      name: "Ghost Ship",
      maxHealth: 10,
      spriteKey: "ghost_ship",
      abilities: [
        new DefendAbility(2),
        new DefendAbility(3),
        new DealDamageAbility(2),
        new DealDamageAbility(3),
        new DealDamageAbility(4),
      ],
    }),
  );
}

interface NightConfig {
  pool: EnemyFactory[];
  // If set, this enemy is forced into the night's final slot (the night's
  // boss). Other enemies are drawn from `pool` (with `bossLast` excluded).
  bossLast?: EnemyFactory;
}

// Pools for each night. See "Add encounters divided by nights" brief.
const NIGHT_CONFIGS: NightConfig[] = [
  { pool: [createWingsOfHorror, createSirens] },
  { pool: [createWingsOfHorror, createSirens, createSkyWraith, createFogOfDarkness] },
  {
    pool: [createFogOfDarkness, createTentacleEncounter],
    bossLast: createGhostShip,
  },
];

const ENCOUNTERS_PER_NIGHT = 8;
const ENEMIES_PER_NIGHT = 3;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickEnemies(config: NightConfig): UnfriendlyEncounter[] {
  const lastCount = config.bossLast ? 1 : 0;
  const restCount = ENEMIES_PER_NIGHT - lastCount;
  const restPool = config.pool;
  const rest: EnemyFactory[] = [];
  if (restPool.length >= restCount) {
    rest.push(...shuffle(restPool).slice(0, restCount));
  } else {
    // Fallback: pool smaller than the required count, so pick with
    // replacement so the night still hits its enemy quota.
    for (let i = 0; i < restCount; i++) {
      rest.push(restPool[Math.floor(Math.random() * restPool.length)]);
    }
  }
  const picks = [...rest];
  if (config.bossLast) picks.push(config.bossLast);
  return picks.map((make) => make());
}

// Build one night's 8-slot layout: [slot1..slot7, lastEnemy]. Two enemies
// plus the rest are shuffled into slots 1-7; the third enemy closes the
// night. Loot fishers are NOT counted in the 8 — they are inserted by the
// caller after each enemy.
function buildNightSlots(nightIdx: number): Encounter[] {
  const enemies = pickEnemies(NIGHT_CONFIGS[nightIdx]);
  const lastEnemy = enemies[enemies.length - 1];
  const otherEnemies = enemies.slice(0, enemies.length - 1);

  const wizardCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
  const wizards: Encounter[] = [];
  for (let i = 0; i < wizardCount; i++) wizards.push(new WizardTeachingPlaceholder());

  const shipwreck = createEncounterById("bandits_shipwreck", { lightOn: false });
  const banditsSeeds: Encounter[] = shipwreck ? [shipwreck] : [];

  const fillersNeeded = Math.max(
    0,
    ENCOUNTERS_PER_NIGHT - 1 - otherEnemies.length - wizards.length - banditsSeeds.length,
  );
  const fillerPool = shuffle(FRIENDLY_POOL);
  const fillers: Encounter[] = [];
  for (let i = 0; i < fillersNeeded; i++) {
    fillers.push(cloneFriendly(fillerPool[i % fillerPool.length]));
  }

  const frontSlots = shuffle([
    ...otherEnemies,
    ...wizards,
    ...banditsSeeds,
    ...fillers,
  ]);
  return [...frontSlots, lastEnemy];
}

export interface BuildDeckOptions {
  includeTutorial?: boolean;
}

// Story opener pinned to the top of each night; materialized at runtime so
// blink sequences can read the current light state. Night 3's opener may
// resolve to null (skipped if the Night 2 wife beat was failed).
const NIGHT_OPENER_IDS: readonly (string | null)[] = [
  "wizard_probation",
  "wife_night2",
  "wife_night3",
];
const FINAL_STORY_ID = "wizard_final";

export function buildDefaultDeck(opts: BuildDeckOptions = {}): Encounter[] {
  const deck: Encounter[] = [];
  if (opts.includeTutorial) {
    deck.push(new TutorialEncounter());
    deck.push(createTentacleEncounter());
    deck.push(createLootFisher());
  }
  for (let nightIdx = 0; nightIdx < NIGHT_CONFIGS.length; nightIdx++) {
    deck.push(new NightEncounter(nightIdx + 1));
    const openerId = NIGHT_OPENER_IDS[nightIdx];
    if (openerId) deck.push(new DeferredEncounter(openerId, true));
    const slots = buildNightSlots(nightIdx);
    for (const enc of slots) {
      deck.push(enc);
      if (enc instanceof UnfriendlyEncounter) deck.push(createLootFisher());
    }
  }
  deck.push(new DeferredEncounter(FINAL_STORY_ID, true));
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
