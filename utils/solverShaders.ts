
export const VS_CODE = `
struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
}

@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );

  var output : VertexOutput;
  output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  // Map [-1, 1] to [0, 1] for UVs
  output.uv = pos[VertexIndex] * 0.5 + 0.5; 
  return output;
}
`

export const FS_CODE = `
@group(0) @binding(0) var gridTexture : texture_3d<u32>;
@group(0) @binding(1) var uniformParams : UniformParams;

struct UniformParams {
  layerIndex : u32,
}

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
}

@fragment
fn main(input : VertexOutput) -> @location(0) vec4<f32> {
  let dim = textureDimensions(gridTexture);
  
  let x = u32(input.uv.x * f32(dim.x));
  let y = u32(input.uv.y * f32(dim.y));
  let z = uniformParams.layerIndex;

  // Load value (R channel only for now)
  let val = textureLoad(gridTexture, vec3<u32>(x, y, z), 0).r;

  if (val > 0u) {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Red for Obstacle
  }
  return vec4<f32>(0.1, 0.1, 0.1, 1.0); // Dark Gray background
}
`
