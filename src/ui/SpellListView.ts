import Phaser from "phaser";
import {
  ALL_SPELLS,
  LightState,
  SPELL_SEQUENCE_LENGTH,
  Spell,
  SpellId,
} from "../game/Spell";
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

interface SpellRow {
  id: SpellId;
  bg: Phaser.GameObjects.Rectangle;
}

export class SpellListView {
  private scene: Phaser.Scene;
  private rows: SpellRow[] = [];
  private currentDots: Phaser.GameObjects.Arc[] = [];
  private panelBounds: { left: number; top: number; width: number; height: number } | null = null;

  constructor(scene: Phaser.Scene, screenHeight: number, knownIds: readonly SpellId[]) {
    this.scene = scene;
    const known = new Set(knownIds);
    const spells = ALL_SPELLS.filter((s) => known.has(s.id));
    if (spells.length === 0) return;

    const panelHeight =
      PAD * 2 + HEADER_HEIGHT + CURRENT_HEIGHT + spells.length * ROW_HEIGHT + (spells.length - 1) * ROW_GAP;
    const panelLeft = MARGIN;
    const panelTop = screenHeight - MARGIN - panelHeight;
    this.panelBounds = { left: panelLeft, top: panelTop, width: PANEL_WIDTH, height: panelHeight };

    scene.add
      .rectangle(panelLeft, panelTop, PANEL_WIDTH, panelHeight, BG_COLOR, BG_ALPHA)
      .setOrigin(0)
      .setStrokeStyle(1, 0x2a2a3a)
      .setDepth(DEPTH);

    createText(scene, panelLeft + PAD, panelTop + PAD, "SPELLS", {
      fontSize: "24px",
      color: "#ffd27a",
    }).setDepth(DEPTH + 1);

    this.buildCurrentSequence(panelLeft, panelTop + PAD + HEADER_HEIGHT);

    const rowsTop = panelTop + PAD + HEADER_HEIGHT + CURRENT_HEIGHT;
    spells.forEach((spell, i) => {
      const rowY = rowsTop + i * (ROW_HEIGHT + ROW_GAP);
      this.drawRow(spell, panelLeft, rowY);
    });
  }

  setSequence(history: readonly LightState[]): void {
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

  flashSpell(id: SpellId, durationMs = 600): void {
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

  // World-space anchor for spawning floating effects near a spell row.
  rowAnchor(id: SpellId): { x: number; y: number } | null {
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

  private buildCurrentSequence(panelLeft: number, y: number): void {
    createText(this.scene, panelLeft + PAD, y, "CURRENT", {
      fontSize: "14px",
      color: "#8a8aa0",
    }).setDepth(DEPTH + 1);

    const dotsX = panelLeft + PANEL_WIDTH - PAD - DOT_SPACING * SPELL_SEQUENCE_LENGTH + DOT_SPACING / 2;
    const dotsY = y + 10;
    for (let i = 0; i < SPELL_SEQUENCE_LENGTH; i++) {
      const dot = this.scene.add
        .circle(dotsX + i * DOT_SPACING, dotsY, DOT_RADIUS, EMPTY_COLOR)
        .setStrokeStyle(1, 0x101018)
        .setAlpha(0.6)
        .setDepth(DEPTH + 1);
      this.currentDots.push(dot);
    }
  }

  private drawRow(spell: Spell, panelLeft: number, rowY: number): void {
    const bg = this.scene.add
      .rectangle(panelLeft + PAD / 2, rowY - 2, PANEL_WIDTH - PAD, ROW_HEIGHT, ROW_FLASH_COLOR, 0)
      .setOrigin(0)
      .setDepth(DEPTH);

    createText(this.scene, panelLeft + PAD, rowY, spell.name, {
      fontSize: "18px",
      color: NAME_COLOR,
    }).setDepth(DEPTH + 1);

    createText(this.scene, panelLeft + PAD, rowY + 20, spell.description, {
      fontSize: "12px",
      color: DESC_COLOR,
    }).setDepth(DEPTH + 1);

    const dotsX = panelLeft + PANEL_WIDTH - PAD - DOT_SPACING * 3 + DOT_SPACING / 2;
    const dotsY = rowY + ROW_HEIGHT / 2 - 4;
    spell.sequence.forEach((state, idx) => {
      this.scene.add
        .circle(dotsX + idx * DOT_SPACING, dotsY, DOT_RADIUS, dotColor(state))
        .setStrokeStyle(1, 0x101018)
        .setDepth(DEPTH + 1);
    });

    this.rows.push({ id: spell.id, bg });
  }
}

function dotColor(state: LightState): number {
  return state === "on" ? ON_COLOR : OFF_COLOR;
}
