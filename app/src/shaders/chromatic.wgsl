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

// Overlay-only chromatic aberration: we cannot actually offset the page's
// pixels, so we paint red/blue corner fringes whose strength grows with
// distance from the center. Feels like channel separation at the edges.
@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time;
  let intensity = u.intensity;

  let center = uv - 0.5;
  let dist = length(center);

  // Direction-weighted fringes: red pulls toward one corner, blue toward the opposite.
  let nx = center.x;
  let ny = center.y;

  let fringe = smoothstep(0.25, 0.75, dist);

  // Red channel leans toward +x / -y; blue leans toward -x / +y.
  let redMask = clamp(nx * 1.2 - ny * 1.2, 0.0, 1.0) * fringe;
  let blueMask = clamp(-nx * 1.2 + ny * 1.2, 0.0, 1.0) * fringe;
  let greenMask = fringe * 0.15;

  // Gentle shimmer so it doesn't look static
  let shimmer = 0.9 + 0.1 * sin(t * 1.5 + dist * 6.0);

  var color = vec3f(0.0);
  color.r = redMask * 0.55 * shimmer;
  color.b = blueMask * 0.55 * shimmer;
  color.g = greenMask * 0.25;

  let strength = intensity;
  let outColor = color * strength;
  let alpha = clamp(fringe * 0.45 * strength, 0.0, 0.55);

  return vec4f(outColor * alpha, alpha);
}
