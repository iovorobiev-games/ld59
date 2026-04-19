import Phaser from "phaser";
import {
  ALL_SIGNALS,
  LightState,
  SIGNAL_SEQUENCE_LENGTH,
  Signal,
  SignalId,
} from "../game/Signal";
import { createText } from "./fonts";

// Paper sprite (signals_list.png) is authored on a full 1920x1080 canvas with
// the torn paper landing on the door's upper half. Rendering at (0,-16) nudges
// it 16px up so the pin/top edge is clear of the bottom panel strip.
const PAPER_LEFT = 1299;
const PAPER_TOP = 273;
const PAPER_WIDTH = 293;
const PAPER_HEIGHT = 389;
const PAPER_Y_OFFSET = -16;

const CONTENT_PAD_X = 34;
const CONTENT_PAD_TOP = 18;
const CONTENT_LEFT = PAPER_LEFT + CONTENT_PAD_X;
const CONTENT_WIDTH = PAPER_WIDTH - CONTENT_PAD_X * 2;
const CONTENT_TOP = PAPER_TOP + CONTENT_PAD_TOP + PAPER_Y_OFFSET;

const TITLE_HEIGHT = 32;
const ROW_HEIGHT = 46;

const PIP_SCALE = 0.45;
const PIP_SPACING = 22;
// Derived from lit.png native width (43px) * PIP_SCALE. Used to reserve room
// for the row's signal pattern so the name text wraps before colliding with it.
const PIP_SLOT_WIDTH = 43 * PIP_SCALE;

const INK_DARK = "#2a1f0c";
const INK_NAME = "#3a2a14";
const INK_DESC = "#60482c";
const ROW_FLASH_COLOR = 0xffd27a;

// Paper sits over the door but under the friendly-view text and the bottom
// panel. Those surfaces explicitly claim higher depths so the list is always
// occluded by them when they overlap.
const DEPTH_PAPER = 4;
const DEPTH_CONTENT = 5;

interface SignalRow {
  id: SignalId;
  highlight: Phaser.GameObjects.Rectangle;
}

export class SignalListView {
  private scene: Phaser.Scene;
  private paper: Phaser.GameObjects.Image;
  private created: Phaser.GameObjects.GameObject[] = [];
  private rows: SignalRow[] = [];
  private knownKey = "";

  constructor(scene: Phaser.Scene, _screenHeight: number, knownIds: readonly SignalId[]) {
    this.scene = scene;
    this.paper = scene.add
      .image(0, PAPER_Y_OFFSET, "signals_list")
      .setOrigin(0, 0)
      .setDepth(DEPTH_PAPER);
    this.setKnown(knownIds);
  }

  setKnown(knownIds: readonly SignalId[]): void {
    const known = new Set(knownIds);
    const signals = ALL_SIGNALS.filter((s) => known.has(s.id));
    const key = signals.map((s) => s.id).join(",");
    if (key === this.knownKey) return;
    this.knownKey = key;
    this.destroyContent();
    this.paper.setVisible(signals.length > 0);
    if (signals.length === 0) return;
    this.buildContent(signals);
  }

  setSequence(_history: readonly LightState[]): void {
    // The CURRENT sequence indicator now lives outside the paper list (on the
    // lighthouse HUD and bottom panel), so the paper just tracks the known
    // signals. Kept as a no-op to preserve the existing caller API.
  }

  flashSignal(id: SignalId, durationMs = 600): void {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return;
    this.scene.tweens.killTweensOf(row.highlight);
    row.highlight.fillColor = ROW_FLASH_COLOR;
    row.highlight.fillAlpha = 0.55;
    this.scene.tweens.add({
      targets: row.highlight,
      fillAlpha: 0,
      duration: durationMs,
      ease: "Cubic.Out",
    });
  }

  private destroyContent(): void {
    this.created.forEach((obj) => obj.destroy());
    this.created = [];
    this.rows = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.created.push(obj);
    return obj;
  }

  private buildContent(signals: Signal[]): void {
    const titleY = CONTENT_TOP;
    this.track(
      createText(this.scene, CONTENT_LEFT + CONTENT_WIDTH / 2, titleY, "SIGNALS", {
        fontSize: "26px",
        color: INK_DARK,
      })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH_CONTENT),
    );

    let cursorY = titleY + TITLE_HEIGHT + 6;
    const ROW_GAP = 6;
    signals.forEach((signal) => {
      const used = this.drawRow(signal, cursorY);
      cursorY += used + ROW_GAP;
    });
  }

  private drawRow(signal: Signal, rowY: number): number {
    const pipsRight = CONTENT_LEFT + CONTENT_WIDTH;
    const pipsSlot = PIP_SPACING * (SIGNAL_SEQUENCE_LENGTH - 1) + PIP_SLOT_WIDTH;
    const textMaxWidth = CONTENT_WIDTH - pipsSlot - 8;

    const nameText = createText(this.scene, CONTENT_LEFT, rowY, signal.name, {
      fontSize: "18px",
      color: INK_NAME,
      fontStyle: "bold",
      wordWrap: { width: textMaxWidth },
    }).setDepth(DEPTH_CONTENT);
    this.track(nameText);

    const descY = rowY + nameText.height + 2;
    const descText = createText(this.scene, CONTENT_LEFT, descY, signal.description, {
      fontSize: "16px",
      color: INK_DESC,
      wordWrap: { width: textMaxWidth },
    }).setDepth(DEPTH_CONTENT);
    this.track(descText);

    const rowHeight = Math.max(ROW_HEIGHT, descY + descText.height - rowY);

    const highlight = this.scene.add
      .rectangle(CONTENT_LEFT - 4, rowY - 2, CONTENT_WIDTH + 8, rowHeight, ROW_FLASH_COLOR, 0)
      .setOrigin(0)
      .setDepth(DEPTH_CONTENT - 1);
    this.track(highlight);

    const pipsY = rowY + rowHeight / 2;
    signal.sequence.forEach((state, idx) => {
      const cx =
        pipsRight -
        (SIGNAL_SEQUENCE_LENGTH - 1 - idx) * PIP_SPACING -
        PIP_SLOT_WIDTH / 2;
      const pip = this.scene.add
        .image(cx, pipsY, state === "on" ? "lit" : "unlit")
        .setOrigin(0.5, 0.5)
        .setScale(PIP_SCALE)
        .setDepth(DEPTH_CONTENT);
      this.track(pip);
    });

    this.rows.push({ id: signal.id, highlight });
    return rowHeight;
  }
}
