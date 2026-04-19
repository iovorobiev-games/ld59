import Phaser from "phaser";

const HIT_HURT_KEYS = ["hitHurt", "hitHurt1", "hitHurt2", "hitHurt3"];
const SYNTH_KEYS = ["synth_1", "synth_2", "synth_3", "synth_4"];
const AMBIENT_KEY = "ambient";
const EXPLOSION_KEY = "explosion";
const CLICK_LIGHT_KEY = "click_light";
const AMBIENT_VOLUME = 0.1;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const Sfx = {
  hitHurt(scene: Phaser.Scene, volume = 0.7): void {
    scene.sound.play(pick(HIT_HURT_KEYS), { volume });
  },
  synth(scene: Phaser.Scene, volume = 0.35): void {
    scene.sound.play(pick(SYNTH_KEYS), { volume });
  },
  explosion(scene: Phaser.Scene, volume = 0.7): void {
    scene.sound.play(EXPLOSION_KEY, { volume });
  },
  clickLight(scene: Phaser.Scene, volume = 0.7): void {
    scene.sound.play(CLICK_LIGHT_KEY, { volume });
  },
  explosionBurst(scene: Phaser.Scene, count: number, spacingMs: number, volume = 0.7): void {
    for (let i = 0; i < count; i++) {
      if (i === 0) {
        scene.sound.play(EXPLOSION_KEY, { volume });
      } else {
        scene.time.delayedCall(i * spacingMs, () => scene.sound.play(EXPLOSION_KEY, { volume }));
      }
    }
  },
  ensureAmbient(scene: Phaser.Scene): void {
    const existing = scene.sound.get(AMBIENT_KEY);
    if (existing && existing.isPlaying) return;
    scene.sound.play(AMBIENT_KEY, { loop: true, volume: AMBIENT_VOLUME });
  },
};
