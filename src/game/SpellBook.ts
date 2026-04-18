import {
  ALL_SPELLS,
  LightState,
  SPELL_SEQUENCE_LENGTH,
  Spell,
  SpellId,
  sequencesMatch,
} from "./Spell";

export class SpellBook {
  private history: LightState[] = [];
  private known: Set<SpellId>;

  constructor(known: readonly SpellId[]) {
    this.known = new Set(known);
  }

  sequence(): readonly LightState[] {
    return this.history;
  }

  knownIds(): readonly SpellId[] {
    return ALL_SPELLS.filter((s) => this.known.has(s.id)).map((s) => s.id);
  }

  unknownIds(): readonly SpellId[] {
    return ALL_SPELLS.filter((s) => !this.known.has(s.id)).map((s) => s.id);
  }

  knows(id: SpellId): boolean {
    return this.known.has(id);
  }

  learn(id: SpellId): void {
    this.known.add(id);
  }

  // Slides in a new state; on match clears the buffer and returns the spell.
  recordAndMatch(state: LightState): Spell | null {
    this.history.push(state);
    if (this.history.length > SPELL_SEQUENCE_LENGTH) {
      this.history.splice(0, this.history.length - SPELL_SEQUENCE_LENGTH);
    }
    if (this.history.length < SPELL_SEQUENCE_LENGTH) return null;
    for (const spell of ALL_SPELLS) {
      if (!this.known.has(spell.id)) continue;
      if (sequencesMatch(this.history, spell.sequence)) {
        this.history = [];
        return spell;
      }
    }
    return null;
  }
}
