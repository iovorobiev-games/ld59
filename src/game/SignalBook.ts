import {
  ALL_SIGNALS,
  LightState,
  SIGNAL_SEQUENCE_LENGTH,
  Signal,
  SignalId,
  sequencesMatch,
} from "./Signal";

export class SignalBook {
  private history: LightState[] = [];
  private known: Set<SignalId>;

  constructor(known: readonly SignalId[]) {
    this.known = new Set(known);
  }

  sequence(): readonly LightState[] {
    return this.history;
  }

  knownIds(): readonly SignalId[] {
    return ALL_SIGNALS.filter((s) => this.known.has(s.id)).map((s) => s.id);
  }

  unknownIds(): readonly SignalId[] {
    return ALL_SIGNALS.filter((s) => !this.known.has(s.id)).map((s) => s.id);
  }

  knows(id: SignalId): boolean {
    return this.known.has(id);
  }

  learn(id: SignalId): void {
    this.known.add(id);
  }

  recordAndMatch(state: LightState): Signal | null {
    this.history.push(state);
    if (this.history.length > SIGNAL_SEQUENCE_LENGTH) {
      this.history.splice(0, this.history.length - SIGNAL_SEQUENCE_LENGTH);
    }
    if (this.history.length < SIGNAL_SEQUENCE_LENGTH) return null;
    for (const signal of ALL_SIGNALS) {
      if (!this.known.has(signal.id)) continue;
      if (sequencesMatch(this.history, signal.sequence)) {
        this.history = [];
        return signal;
      }
    }
    return null;
  }
}
