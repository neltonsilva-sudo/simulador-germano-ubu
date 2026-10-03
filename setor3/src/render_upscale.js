// Portado do gêmeo do Laboratório de Eletricidade (render_upscale.js). Ampliação de alta qualidade + nitidez adaptativa (inspirado no AMD FSR 1: EASU + RCAS),
// usada com a resolução dinâmica: a cena é calculada em resolução menor e este passo amplia para a tela.
// Ampliação bicúbica Catmull-Rom (9 amostras bilineares) + nitidez adaptativa ao contraste, limitada pela
// vizinhança (sem halos).
export const UpscaleShader = {
  name: 'UpscaleShader',
  uniforms: {
    tDiffuse: { value: null },
    srcSize: { value: null },   // tamanho da imagem de entrada, em pixels (vec2)
    sharp: { value: 0.3 },      // 0..1
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 srcSize; uniform float sharp; varying vec2 vUv;
    vec3 catmullRom(vec2 uv){
      vec2 sp = uv * srcSize, tp = floor(sp - 0.5) + 0.5, f = sp - tp;
      vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
      vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
      vec2 w12 = w1 + w2, o12 = w2 / w12;
      vec2 t0 = (tp - 1.0) / srcSize, t3 = (tp + 2.0) / srcSize, t12 = (tp + o12) / srcSize;
      vec3 c = vec3(0.0);
      c += texture2D(tDiffuse, vec2(t0.x, t0.y)).rgb * w0.x * w0.y;  c += texture2D(tDiffuse, vec2(t12.x, t0.y)).rgb * w12.x * w0.y;  c += texture2D(tDiffuse, vec2(t3.x, t0.y)).rgb * w3.x * w0.y;
      c += texture2D(tDiffuse, vec2(t0.x, t12.y)).rgb * w0.x * w12.y; c += texture2D(tDiffuse, vec2(t12.x, t12.y)).rgb * w12.x * w12.y; c += texture2D(tDiffuse, vec2(t3.x, t12.y)).rgb * w3.x * w12.y;
      c += texture2D(tDiffuse, vec2(t0.x, t3.y)).rgb * w0.x * w3.y;  c += texture2D(tDiffuse, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;  c += texture2D(tDiffuse, vec2(t3.x, t3.y)).rgb * w3.x * w3.y;
      return c;
    }
    void main(){
      vec2 px = 1.0 / srcSize;
      vec3 c = catmullRom(vUv);
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb, s = texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb, w = texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb;
      vec3 mn = min(min(n, s), min(e, w)), mx = max(max(n, s), max(e, w));
      mn = min(mn, c); mx = max(mx, c);
      // nitidez adaptativa: menos onde o contraste local já é alto
      vec3 amp = clamp(min(mn, 1.0 - mx) / max(mx, 1e-3), 0.0, 1.0);
      vec3 k = sqrt(amp) * sharp;
      vec3 avg = 0.25 * (n + s + e + w);
      vec3 o = c + (c - avg) * k * 1.6;
      gl_FragColor = vec4(clamp(o, mn, mx), 1.0);
    }`,
};
