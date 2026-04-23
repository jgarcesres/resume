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

// 4x4 Bayer matrix for ordered dithering.
fn bayer4(p: vec2i) -> f32 {
  var m = array<f32, 16>(
     0.0,  8.0,  2.0, 10.0,
    12.0,  4.0, 14.0,  6.0,
     3.0, 11.0,  1.0,  9.0,
    15.0,  7.0, 13.0,  5.0,
  );
  let x = p.x & 3;
  let y = p.y & 3;
  return m[y * 4 + x] / 16.0;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let intensity = u.intensity;

  // Dither cell size — bigger on mobile for visibility.
  let cellSize = select(2.0, 3.0, u.cssWidth < 768.0);
  let pix = vec2i(uv * u.resolution / cellSize);
  let dither = bayer4(pix);

  // Thick scanlines — every other ~4-pixel row is darker.
  let scanScale = select(4.0, 6.0, u.cssWidth < 768.0);
  let scanRow = i32(uv.y * u.resolution.y / scanScale) & 1;
  let scanDark = select(0.0, 0.38, scanRow == 0);

  // Posterized alpha pattern: quantize the dither value so it looks stepped.
  let step = floor(dither * 4.0) / 4.0;
  let ditherAlpha = step * 0.38;

  // Green CRT tint on the dark pixels
  let tint = vec3f(0.08, 0.28, 0.12);

  let alpha = clamp((scanDark + ditherAlpha) * intensity, 0.0, 0.78);
  let color = tint;

  return vec4f(color * alpha, alpha);
}
