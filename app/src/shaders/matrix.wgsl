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

fn hash11(x: f32) -> f32 {
  return fract(sin(x * 127.1) * 43758.5453);
}

fn hash21(p: vec2f) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

// Matrix rain on transparent background. Columns of "characters" (pixel blocks)
// fall at varying speeds; head of each trail is bright, tail fades out.
@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time;
  let intensity = u.intensity;

  // Character cell size — chunky pixel blocks, larger on mobile.
  let cellPx = select(14.0, 18.0, u.cssWidth < 768.0);
  let cols = floor(u.resolution.x / cellPx);
  let rows = floor(u.resolution.y / cellPx);

  let colIdx = floor(uv.x * cols);
  let rowIdx = floor(uv.y * rows);

  // Per-column speed and offset so columns don't sync.
  let speed = 2.0 + hash11(colIdx) * 6.0;
  let offset = hash11(colIdx + 101.0) * rows;

  // Head position for this column (in rows).
  let head = fract((t * speed + offset) / rows) * rows;
  // Distance below head (wrap around).
  var dy = head - rowIdx;
  if (dy < 0.0) { dy += rows; }

  // Trail length varies per column.
  let trail = 10.0 + hash11(colIdx + 31.0) * 14.0;
  let inTrail = step(dy, trail);
  let fade = 1.0 - dy / trail;

  // Per-cell pseudo-random "character" pattern: shift the brightness so each
  // cell looks different and characters appear to tick over time.
  let tick = floor(t * 8.0);
  let cellHash = hash21(vec2f(colIdx, rowIdx) + vec2f(tick * 0.017, 0.0));
  let charMask = step(0.35, cellHash);

  // Head of the trail is brighter and nearly white; body is green.
  let isHead = step(dy, 1.0);
  let headColor = vec3f(0.85, 1.0, 0.9);
  let bodyColor = vec3f(0.22, 1.0, 0.35);
  let color = mix(bodyColor, headColor, isHead);

  let brightness = fade * charMask * inTrail;
  let strength = 0.55 * intensity;
  let alpha = clamp(brightness * strength, 0.0, 0.7);

  return vec4f(color * alpha, alpha);
}
