import Phaser from "phaser";
import {
  ALL_SIGNALS,
  LightState,
  SIGNAL_SEQUENCE_LENGTH,
  Signal,
  SignalId,
} from "../game/Signal";
import { createText } from "./fonts";

const MARGIN = 24;
const PANEL_WIDTH = 320;
const ROW_HEIGHT = 44;
const ROW_GAP = 4;
const HEADER_HEIGHT = 40;
const CURRENT_HEIGHT = 40;
const PAD = 12;
const DOT_RADIUS = 6;
const DOT_SPACING = 18;
const BG_COLOR = 0x101018;
const BG_ALPHA = 0.6;
const NAME_COLOR = "#ffe6a8";
const DESC_COLOR = "#c8bfa0";
const ON_COLOR = 0xffd27a;
const OFF_COLOR = 0x444455;
const EMPTY_COLOR = 0x2a2a3a;
const ROW_FLASH_COLOR = 0x5a3a14;
const DEPTH = 50;

interface SignalRow {
  id: SignalId;
  bg: Phaser.GameObjects.Rectangle;
}

export class SignalListView {
  private scene: Phaser.Scene;
  private screenHeight: number;
  private created: Phaser.GameObjects.GameObject[] = [];
  private rows: SignalRow[] = [];
  private currentDots: Phaser.GameObjects.Arc[] = [];
  private panelBounds: { left: number; top: number; width: number; height: number } | null = null;
  private knownKey = "";
  private lastSequence: readonly LightState[] = [];

  constructor(scene: Phaser.Scene, screenHeight: number, knownIds: readonly SignalId[]) {
    this.scene = scene;
    this.screenHeight = screenHeight;
    this.setKnown(knownIds);
  }

  setKnown(knownIds: readonly SignalId[]): void {
    const known = new Set(knownIds);
    const signals = ALL_SIGNALS.filter((s) => known.has(s.id));
    const key = signals.map((s) => s.id).join(",");
    if (key === this.knownKey) return;
    this.knownKey = key;
    this.destroyAll();
    if (signals.length === 0) return;
    this.buildPanel(signals);
    this.setSequence(this.lastSequence);
  }

  setSequence(history: readonly LightState[]): void {
    this.lastSequence = history;
    this.currentDots.forEach((dot, i) => {
      const state = history[i];
      if (state === undefined) {
        dot.fillColor = EMPTY_COLOR;
        dot.setAlpha(0.6);
      } else {
        dot.fillColor = dotColor(state);
        dot.setAlpha(1);
      }
    });
  }

  flashSignal(id: SignalId, durationMs = 600): void {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return;
    this.scene.tweens.killTweensOf(row.bg);
    row.bg.fillColor = ROW_FLASH_COLOR;
    row.bg.fillAlpha = 0.95;
    this.scene.tweens.add({
      targets: row.bg,
      fillAlpha: 0,
      duration: durationMs,
      ease: "Cubic.Out",
    });
  }

  rowAnchor(id: SignalId): { x: number; y: number } | null {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    return { x: row.bg.x + row.bg.width / 2, y: row.bg.y + row.bg.height / 2 };
  }

  panelRightCenter(): { x: number; y: number } | null {
    if (!this.panelBounds) return null;
    return {
      x: this.panelBounds.left + this.panelBounds.width,
      y: this.panelBounds.top + this.panelBounds.height / 2,
    };
  }

  private destroyAll(): void {
    this.created.forEach((obj) => obj.destroy());
    this.created = [];
    this.rows = [];
    this.currentDots = [];
    this.panelBounds = null;
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.created.push(obj);
    return obj;
  }

  private buildPanel(signals: Signal[]): void {
    const panelHeight =
      PAD * 2 + HEADER_HEIGHT + CURRENT_HEIGHT + signals.length * ROW_HEIGHT + (signals.length - 1) * ROW_GAP;
    const panelLeft = MARGIN;
    const panelTop = this.screenHeight - MARGIN - panelHeight;
    this.panelBounds = { left: panelLeft, top: panelTop, width: PANEL_WIDTH, height: panelHeight };

    this.track(
      this.scene.add
        .rectangle(panelLeft, panelTop, PANEL_WIDTH, panelHeight, BG_COLOR, BG_ALPHA)
        .setOrigin(0)
        .setStrokeStyle(1, 0x2a2a3a)
        .setDepth(DEPTH),
    );

    this.track(
      createText(this.scene, panelLeft + PAD, panelTop + PAD, "SIGNALS", {
        fontSize: "24px",
        color: "#ffd27a",
      }).setDepth(DEPTH + 1),
    );

    this.buildCurrentSequence(panelLeft, panelTop + PAD + HEADER_HEIGHT);

    const rowsTop = panelTop + PAD + HEADER_HEIGHT + CURRENT_HEIGHT;
    signals.forEach((signal, i) => {
      const rowY = rowsTop + i * (ROW_HEIGHT + ROW_GAP);
      this.drawRow(signal, panelLeft, rowY);
    });
  }

  private buildCurrentSequence(panelLeft: number, y: number): void {
    this.track(
      createText(this.scene, panelLeft + PAD, y, "CURRENT", {
        fontSize: "14px",
        color: "#8a8aa0",
      }).setDepth(DEPTH + 1),
    );

    const dotsX = panelLeft + PANEL_WIDTH - PAD - DOT_SPACING * SIGNAL_SEQUENCE_LENGTH + DOT_SPACING / 2;
    const dotsY = y + 10;
    for (let i = 0; i < SIGNAL_SEQUENCE_LENGTH; i++) {
      const dot = this.scene.add
        .circle(dotsX + i * DOT_SPACING, dotsY, DOT_RADIUS, EMPTY_COLOR)
        .setStrokeStyle(1, 0x101018)
        .setAlpha(0.6)
        .setDepth(DEPTH + 1);
      this.track(dot);
      this.currentDots.push(dot);
    }
  }

  private drawRow(signal: Signal, panelLeft: number, rowY: number): void {
    const bg = this.scene.add
      .rectangle(panelLeft + PAD / 2, rowY - 2, PANEL_WIDTH - PAD, ROW_HEIGHT, ROW_FLASH_COLOR, 0)
      .setOrigin(0)
      .setDepth(DEPTH);
    this.track(bg);

    this.track(
      createText(this.scene, panelLeft + PAD, rowY, signal.name, {
        fontSize: "18px",
        color: NAME_COLOR,
      }).setDepth(DEPTH + 1),
    );

    this.track(
      createText(this.scene, panelLeft + PAD, rowY + 20, signal.description, {
        fontSize: "12px",
        color: DESC_COLOR,
      }).setDepth(DEPTH + 1),
    );

    const dotsX = panelLeft + PANEL_WIDTH - PAD - DOT_SPACING * 3 + DOT_SPACING / 2;
    const dotsY = rowY + ROW_HEIGHT / 2 - 4;
    signal.sequence.forEach((state, idx) => {
      this.track(
        this.scene.add
          .circle(dotsX + idx * DOT_SPACING, dotsY, DOT_RADIUS, dotColor(state))
          .setStrokeStyle(1, 0x101018)
          .setDepth(DEPTH + 1),
      );
    });

    this.rows.push({ id: signal.id, bg });
  }
}

function dotColor(state: LightState): number {
  return state === "on" ? ON_COLOR : OFF_COLOR;
}
