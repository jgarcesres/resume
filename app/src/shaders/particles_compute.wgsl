// Compute shader: evolves particle state per frame.
// Each particle is assigned to a skill-tree edge and drifts along it with
// spring dynamics, perpendicular jitter, and pointer repulsion.

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

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> nodePositions: array<vec2f>;
@group(0) @binding(2) var<storage, read> edgeEndpoints: array<vec2u>;
@group(0) @binding(3) var<uniform> u: Uniforms;

fn hash11(p: f32) -> f32 {
  var x = fract(p * 0.1031);
  x = x * (x + 33.33);
  x = x * (x + x);
  return fract(x);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= arrayLength(&particles)) { return; }
  if (u.nEdges == 0u) { return; }

  var p = particles[idx];

  var edgeIdx = u32(p.edge);
  if (edgeIdx >= u.nEdges) {
    edgeIdx = u32(hash11(p.seed + u.time * 0.01 + f32(idx) * 0.007) * f32(u.nEdges));
    if (edgeIdx >= u.nEdges) { edgeIdx = u.nEdges - 1u; }
    p.edge = f32(edgeIdx);
    p.t = hash11(p.seed + 1.23);
  }

  let e = edgeEndpoints[edgeIdx];
  let a = nodePositions[e.x];
  let b = nodePositions[e.y];

  let edgeDir = b - a;
  let edgeLen = max(length(edgeDir), 1.0);
  let speed = 50.0 + hash11(p.seed + 99.0) * 70.0;
  p.t = p.t + (speed / edgeLen) * u.dt;

  if (p.t > 1.0) {
    var newEdge = u32(hash11(p.seed + u.time * 0.013 + f32(idx) * 0.019) * f32(u.nEdges));
    if (newEdge >= u.nEdges) { newEdge = u.nEdges - 1u; }
    p.edge = f32(newEdge);
    p.t = 0.0;
    p.seed = fract(p.seed + 0.61803);
  }

  let target = mix(a, b, p.t);
  let perp = normalize(vec2f(-edgeDir.y, edgeDir.x));
  let jitter = (hash11(p.seed + p.t * 9.7) - 0.5) * 18.0;
  let targetJittered = target + perp * jitter;

  let toTarget = targetJittered - p.pos;
  var force = toTarget * 7.0;

  if (u.mouseActive > 0.5) {
    let d = p.pos - u.mouse;
    let dist = max(length(d), 1.0);
    if (dist < 130.0) {
      let falloff = (130.0 - dist) / 130.0;
      force = force + (d / dist) * falloff * 420.0;
    }
  }

  p.vel = (p.vel + force * u.dt) * 0.88;
  p.pos = p.pos + p.vel * u.dt;
  p.age = p.age + u.dt;

  particles[idx] = p;
}
