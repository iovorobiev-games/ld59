import Phaser from "phaser";

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;

varying vec2 outTexCoord;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(6.0, 5.0);
  uv = uv + uv * offset * offset;
  return uv * 0.5 + 0.5;
}

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = curve(outTexCoord);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float ca = 0.0008;
  vec3 col;
  col.r = texture2D(uMainSampler, uv + vec2(ca, 0.0)).r;
  col.g = texture2D(uMainSampler, uv).g;
  col.b = texture2D(uMainSampler, uv - vec2(ca, 0.0)).b;

  float scan = 0.5 + 0.5 * sin(uv.y * 1200.0);
  col *= mix(0.65, 1.0, scan);

  float n = rand(uv + fract(uTime)) - 0.5;
  col += n * 0.08;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const CRT_PIPELINE_KEY = "Crt";

export class CrtPipeline extends Phaser.Renderer.WebGL.Pipelines
  .PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: CRT_PIPELINE_KEY, fragShader: FRAG });
  }

  onPreRender(): void {
    this.set1f("uTime", this.game.loop.time / 1000);
  }
}

export function applyCrtPipeline(scene: Phaser.Scene): void {
  const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (!renderer.pipelines) return;
  scene.cameras.main.setPostPipeline(CRT_PIPELINE_KEY);
}
