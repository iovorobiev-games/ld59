import Phaser from "phaser";

const HOLD_MS = 140;
const FADE_MS = 260;
const JITTER = 70;
const SEGMENTS = 16;
const FORK_CHANCE = 0.35;

export interface LightningStrikeOptions {
  scene: Phaser.Scene;
  target: { x: number; y: number };
  onImpact?: () => void;
  onComplete?: () => void;
}

// Match SilhouettePipeline outline color so the bolt reads as a contour stroke.
const PALETTE: BoltPalette = {
  mid: { color: 0x48524a, alpha: 0.75 },
  core: { color: 0x48524a, alpha: 1 },
  flashColor: 0x48524a,
  flashAlpha: 0.22,
};

export function playLightningStrike(opts: LightningStrikeOptions): void {
  const { scene, target, onImpact, onComplete } = opts;

  const startX = target.x + (Math.random() - 0.5) * 160;
  const startY = -40;

  const bolt = scene.add.graphics().setDepth(500);
  const spine = buildBolt(startX, startY, target.x, target.y, SEGMENTS);
  drawBolt(bolt, spine, PALETTE);
  for (let i = 2; i < spine.length - 2; i++) {
    if (Math.random() < FORK_CHANCE) drawBolt(bolt, buildFork(spine[i]), PALETTE);
  }

  const flash = scene.add
    .rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      PALETTE.flashColor,
      PALETTE.flashAlpha,
    )
    .setDepth(499);

  scene.cameras.main.shake(240, 0.01);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: HOLD_MS + FADE_MS,
    ease: "Cubic.Out",
    onComplete: () => flash.destroy(),
  });

  scene.time.delayedCall(HOLD_MS, () => {
    onImpact?.();
    scene.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        bolt.destroy();
        onComplete?.();
      },
    });
  });
}

type Pt = { x: number; y: number };

function buildBolt(x0: number, y0: number, x1: number, y1: number, segments: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const baseX = x0 + (x1 - x0) * t;
    const baseY = y0 + (y1 - y0) * t;
    const edge = i === 0 || i === segments;
    const jx = edge ? 0 : (Math.random() - 0.5) * JITTER;
    pts.push({ x: baseX + jx, y: baseY });
  }
  return pts;
}

function buildFork(origin: Pt): Pt[] {
  const len = 120 + Math.random() * 160;
  const angle = (Math.random() - 0.5) * Math.PI * 0.9 + Math.PI / 2;
  const endX = origin.x + Math.cos(angle) * len;
  const endY = origin.y + Math.sin(angle) * len;
  return buildBolt(origin.x, origin.y, endX, endY, 6);
}

interface BoltPalette {
  mid: { color: number; alpha: number };
  core: { color: number; alpha: number };
  flashColor: number;
  flashAlpha: number;
}

function drawBolt(g: Phaser.GameObjects.Graphics, pts: Pt[], p: BoltPalette): void {
  strokePath(g, pts, 8, p.mid.color, p.mid.alpha);
  strokePath(g, pts, 3, p.core.color, p.core.alpha);
}

function strokePath(
  g: Phaser.GameObjects.Graphics,
  pts: Pt[],
  width: number,
  color: number,
  alpha: number,
): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}
