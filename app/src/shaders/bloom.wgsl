struct Uniforms {
  resolution: vec2f,
  time: f32,
  intensity: f32,
  cssWidth: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

// Three drifting soft radial glows in neon accent colors. Overlay-only —
// no framebuffer read, so this is a procedural ambient bloom layer.
fn glow(uv: vec2f, center: vec2f, radius: f32, color: vec3f) -> vec3f {
  let d = length(uv - center);
  let falloff = smoothstep(radius, 0.0, d);
  return color * falloff * falloff;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time;
  let intensity = u.intensity;

  let cyan = vec3f(0.0, 0.9, 1.0);
  let pink = vec3f(1.0, 0.18, 0.67);
  let gold = vec3f(1.0, 0.84, 0.0);

  let c1 = vec2f(0.18 + sin(t * 0.21) * 0.08, 0.28 + cos(t * 0.17) * 0.06);
  let c2 = vec2f(0.82 + sin(t * 0.15 + 1.3) * 0.07, 0.72 + cos(t * 0.19 + 0.7) * 0.05);
  let c3 = vec2f(0.55 + sin(t * 0.11 + 2.1) * 0.10, 0.12 + cos(t * 0.23 + 1.9) * 0.04);

  var color = vec3f(0.0);
  color += glow(uv, c1, 0.55, cyan);
  color += glow(uv, c2, 0.50, pink);
  color += glow(uv, c3, 0.45, gold);

  // Breathing pulse
  let pulse = 0.85 + 0.15 * sin(t * 1.2);
  color *= pulse;

  // Keep subtle — bloom is ambient, not overpowering
  let strength = 0.28 * intensity;
  let outColor = color * strength;
  let alpha = clamp((outColor.r + outColor.g + outColor.b) * 0.5, 0.0, 0.45);

  return vec4f(outColor * alpha, alpha);
}
