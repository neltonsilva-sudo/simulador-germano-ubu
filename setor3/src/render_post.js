// Portado do gêmeo do Laboratório de Eletricidade (render_post.js). "Assinatura" de câmera de celular ultra-angular, aplicada DEPOIS do OutputPass
// (espaço de exibição sRGB): distorção leve, aberração cromática radial, nitidez (unsharp), vinheta,
// balanço de branco / curva, e ruído mínimo de sensor.
import * as THREE from 'three';

export const PhoneShader = {
  name: 'TwinPhoneShader',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1600, 900) },
    time: { value: 0 },
    distortion: { value: 0.0 },     // >0 barril
    chroma: { value: 0.0006 },      // deslocamento RGB nas bordas (fração da largura)
    sharpen: { value: 0.35 },
    vignette: { value: 0.28 },
    grain: { value: 0.010 },
    wb: { value: new THREE.Vector3(1.05, 1.0, 0.93) },   // ganho por canal (display)
    lift: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float time;
    uniform float distortion, chroma, sharpen, vignette, grain, lift, contrast, saturation; uniform vec3 wb;
    varying vec2 vUv;
    vec2 warp( vec2 uv, float k ) { vec2 c = uv - 0.5; c.x *= resolution.x / resolution.y; float r2 = dot( c, c );
      c *= 1.0 + k * r2; c.x /= resolution.x / resolution.y; return c + 0.5; }
    float hash( vec2 p ) { p = fract( p * vec2( 443.897, 441.423 ) ); p += dot( p, p.yx + 19.19 ); return fract( ( p.x + p.y ) * p.x ); }
    void main() {
      vec2 uv = warp( vUv, distortion * 0.25 );
      vec2 d = ( uv - 0.5 );
      float r = length( d * vec2( resolution.x / resolution.y, 1.0 ) );
      vec2 ca = d * chroma * r * 2.0;
      vec2 px = 1.0 / resolution;
      vec3 c;
      c.r = texture2D( tDiffuse, uv + ca ).r;
      c.g = texture2D( tDiffuse, uv ).g;
      c.b = texture2D( tDiffuse, uv - ca ).b;
      // unsharp mask 4-vizinhos (luma) — o "crocante" de celular
      vec3 n = texture2D( tDiffuse, uv + vec2( px.x, 0.0 ) ).rgb + texture2D( tDiffuse, uv - vec2( px.x, 0.0 ) ).rgb
             + texture2D( tDiffuse, uv + vec2( 0.0, px.y ) ).rgb + texture2D( tDiffuse, uv - vec2( 0.0, px.y ) ).rgb;
      vec3 hi = c - n * 0.25;
      c += sharpen * clamp( hi, -0.08, 0.08 ) * 2.0;
      // balanço de branco + curva simples
      c *= wb;
      c = ( c - 0.5 ) * contrast + 0.5 + lift;
      float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c = mix( vec3( l ), c, saturation );
      // vinheta (queda de lente grande-angular, cos^4 suavizado)
      float v = 1.0 - vignette * smoothstep( 0.35, 1.05, r );
      c *= v;
      // ruído de sensor (mais visível nas sombras)
      float g = hash( gl_FragCoord.xy + fract( time ) * 97.0 ) - 0.5;
      c += g * grain * ( 1.2 - l );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
    }`,
};
