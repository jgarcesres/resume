struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VertexOutput;
  out.pos = vec4f(pos[i], 0.0, 1.0);
  out.uv = (pos[i] + 1.0) * 0.5;
  out.uv.y = 1.0 - out.uv.y;
  return out;
}
