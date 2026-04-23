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

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time;
  let intensity = u.intensity;

  var alpha: f32 = 0.0;
  var color = vec3f(0.0);

  // Scanlines — wider on mobile so they remain visible
  let scanScale = select(1.0, 2.0, u.cssWidth < 768.0);
  let scanY = uv.y * u.resolution.y / scanScale;
  let scanPhase = scanY + t * 30.0;
  let scanline = sin(scanPhase * 3.14159 / 2.0);
  let scanAlpha = scanline * scanline * 0.32 * intensity;
  alpha += scanAlpha;

  // Phosphor RGB sub-pixel simulation
  let phosphorScale = select(3.0, 5.0, u.cssWidth < 768.0);
  let px = floor(uv * u.resolution / phosphorScale);
  let subpx = (uv * u.resolution / phosphorScale - px) * phosphorScale;
  let col = i32(px.x) % 3;
  var phosphor = vec3f(0.0);
  if (col == 0) { phosphor = vec3f(1.0, 0.0, 0.0); }
  else if (col == 1) { phosphor = vec3f(0.0, 1.0, 0.0); }
  else { phosphor = vec3f(0.0, 0.0, 1.0); }
  let phosphorMask = smoothstep(0.0, 1.0, length(subpx - vec2f(phosphorScale * 0.5)));
  color += phosphor * phosphorMask * 0.12 * intensity;
  alpha += phosphorMask * 0.07 * intensity;

  // Vignette
  let center = uv - 0.5;
  let dist = length(center);
  let vignetteStrength = select(0.75, 0.95, u.cssWidth < 768.0);
  let vignette = smoothstep(0.25, 0.85, dist) * vignetteStrength * intensity;
  alpha += vignette;

  // Flicker
  let flicker = sin(t * 8.0) * sin(t * 13.7) * 0.025 * intensity;
  alpha += flicker;

  // Moving scan band
  let bandPos = fract(t * 0.05);
  let bandDist = abs(uv.y - bandPos);
  let bandStrength = select(0.12, 0.18, u.cssWidth < 768.0);
  let band = smoothstep(0.06, 0.0, bandDist) * bandStrength * intensity;
  alpha += band;

  // Screen edge glow (cyan)
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.025, 0.0, edgeDist) * 0.28 * intensity;
  color += vec3f(0.0, 0.9, 1.0) * edgeGlow;
  alpha += edgeGlow;

  alpha = clamp(alpha, 0.0, 0.82);

  return vec4f(color * alpha, alpha);
}
