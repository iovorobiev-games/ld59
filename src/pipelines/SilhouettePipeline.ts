import Phaser from "phaser";

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uTexelSize;
uniform vec3 uInsideColor;
uniform vec3 uOutlineColor;

varying vec2 outTexCoord;

void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  if (c.a < 0.01) {
    discard;
  }
  float a_up    = texture2D(uMainSampler, outTexCoord + vec2( 0.0, -uTexelSize.y)).a;
  float a_down  = texture2D(uMainSampler, outTexCoord + vec2( 0.0,  uTexelSize.y)).a;
  float a_left  = texture2D(uMainSampler, outTexCoord + vec2(-uTexelSize.x, 0.0)).a;
  float a_right = texture2D(uMainSampler, outTexCoord + vec2( uTexelSize.x, 0.0)).a;
  float m = min(min(a_up, a_down), min(a_left, a_right));
  vec3 col = mix(uOutlineColor, uInsideColor, step(0.5, m));
  gl_FragColor = vec4(col, c.a);
}
`;

const INSIDE: [number, number, number] = [0x0b / 255, 0x0c / 255, 0x06 / 255];
const OUTLINE: [number, number, number] = [0x48 / 255, 0x52 / 255, 0x4a / 255];
const THICKNESS_PX = 2;

export const SILHOUETTE_PIPELINE_KEY = "Silhouette";

export class SilhouettePipeline extends Phaser.Renderer.WebGL.Pipelines
  .PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: SILHOUETTE_PIPELINE_KEY, fragShader: FRAG });
  }

  onPreRender(): void {
    this.set3f("uInsideColor", INSIDE[0], INSIDE[1], INSIDE[2]);
    this.set3f("uOutlineColor", OUTLINE[0], OUTLINE[1], OUTLINE[2]);
    const w = this.renderer.width || 1920;
    const h = this.renderer.height || 1080;
    this.set2f("uTexelSize", THICKNESS_PX / w, THICKNESS_PX / h);
  }
}
