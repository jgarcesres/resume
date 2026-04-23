// Render shader: draws each particle as a soft radial disc via instanced quads.
// Positions and resolution are in CSS pixels — keeps layout in sync with the
// sibling 2D canvas that draws the skill-tree nodes and edges.

struct Particle {
  pos: vec2f,
  vel: vec2f,
  edge: f32,
  t: f32,
  age: f32,
  seed: f32,
};

struct Uniforms {
  resolution: vec2f,
  mouse: vec2f,
  time: f32,
  dt: f32,
  mouseActive: f32,
  revealProgress: f32,
  themeIsRpg: f32,
  nNodes: u32,
  nEdges: u32,
  _pad: f32,
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) alpha: f32,
  @location(2) tint: vec3f,
};

@vertex
fn vs(
  @builtin(vertex_index) vidx: u32,
  @builtin(instance_index) iidx: u32,
) -> VSOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0),
    vec2f(-1.0, -1.0), vec2f( 1.0,  1.0), vec2f(-1.0,  1.0),
  );

  let p = particles[iidx];
  let speed = length(p.vel);
  let size = 2.4 + min(speed * 0.02, 1.6);
  let pixel = corners[vidx] * size + p.pos;

  let ndc = vec2f(
    (pixel.x / u.resolution.x) * 2.0 - 1.0,
    1.0 - (pixel.y / u.resolution.y) * 2.0,
  );

  let fadeIn = smoothstep(-0.3, 0.8, p.age);
  let reveal = smoothstep(0.0, 1.0, u.revealProgress);

  // RPG: cool cyan-magenta. Pro: warm fern-gold.
  let rpgA = vec3f(0.28, 0.88, 1.0);
  let rpgB = vec3f(1.0, 0.22, 0.75);
  let proA = vec3f(0.37, 0.66, 0.48);
  let proB = vec3f(0.91, 0.70, 0.22);

  let tRpg = mix(rpgA, rpgB, fract(p.seed * 3.1));
  let tPro = mix(proA, proB, fract(p.seed * 3.1));
  let tint = mix(tPro, tRpg, u.themeIsRpg);

  var out: VSOut;
  out.pos = vec4f(ndc, 0.0, 1.0);
  out.uv = corners[vidx];
  out.alpha = fadeIn * reveal;
  out.tint = tint;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let d = length(in.uv);
  if (d > 1.0) { discard; }
  let falloff = pow(1.0 - d, 2.5);
  let rpgMix = smoothstep(0.0, 1.0, in.alpha);
  // Additive feel: premultiply tint by falloff, low alpha.
  let a = falloff * in.alpha * 0.55;
  return vec4f(in.tint * falloff * rpgMix, a);
}
