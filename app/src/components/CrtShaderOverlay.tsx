import { useEffect, useRef, useState } from 'react';

const CRT_SHADER = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  intensity: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  // Fullscreen triangle (covers clip space with one triangle)
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VertexOutput;
  out.pos = vec4f(pos[i], 0.0, 1.0);
  out.uv = (pos[i] + 1.0) * 0.5;
  out.uv.y = 1.0 - out.uv.y; // flip Y for screen coords
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time;
  let intensity = u.intensity;

  var alpha: f32 = 0.0;
  var color = vec3f(0.0);

  // ── Scanlines ──
  // Horizontal scanlines that slowly drift downward
  let scanY = uv.y * u.resolution.y;
  let scanPhase = scanY + t * 30.0;
  let scanline = sin(scanPhase * 3.14159 / 2.0);
  let scanAlpha = scanline * scanline * 0.12 * intensity;
  alpha += scanAlpha;

  // ── Phosphor dot pattern (RGB sub-pixel simulation) ──
  let px = floor(uv * u.resolution / 3.0);
  let subpx = (uv * u.resolution / 3.0 - px) * 3.0;
  let col = i32(px.x) % 3;
  var phosphor = vec3f(0.0);
  if (col == 0) { phosphor = vec3f(1.0, 0.0, 0.0); }
  else if (col == 1) { phosphor = vec3f(0.0, 1.0, 0.0); }
  else { phosphor = vec3f(0.0, 0.0, 1.0); }
  // Subtle phosphor tint
  let phosphorMask = smoothstep(0.0, 1.0, length(subpx - vec2f(1.5)));
  color += phosphor * phosphorMask * 0.04 * intensity;
  alpha += phosphorMask * 0.02 * intensity;

  // ── Vignette ──
  let center = uv - 0.5;
  let dist = length(center);
  let vignette = smoothstep(0.3, 0.85, dist) * 0.5 * intensity;
  alpha += vignette;

  // ── Subtle flicker ──
  let flicker = sin(t * 8.0) * sin(t * 13.7) * 0.008 * intensity;
  alpha += flicker;

  // ── Moving scan band (like a slow refresh line) ──
  let bandPos = fract(t * 0.05);
  let bandDist = abs(uv.y - bandPos);
  let band = smoothstep(0.06, 0.0, bandDist) * 0.06 * intensity;
  alpha += band;

  // ── Screen edge glow ──
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.02, 0.0, edgeDist) * 0.15 * intensity;
  color += vec3f(0.0, 0.9, 1.0) * edgeGlow; // cyan edge glow
  alpha += edgeGlow;

  // Clamp alpha
  alpha = clamp(alpha, 0.0, 0.6);

  return vec4f(color, alpha);
}
`;

async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) return null;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) return null;

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  const shaderModule = device.createShaderModule({ code: CRT_SHADER });

  const uniformBuffer = device.createBuffer({
    size: 16, // vec2f resolution + f32 time + f32 intensity = 16 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module: shaderModule, entryPoint: 'vs' },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });

  return { device, context, pipeline, bindGroup, uniformBuffer, format };
}

interface CrtShaderOverlayProps {
  enabled: boolean;
}

function CrtShaderOverlay({ enabled }: CrtShaderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const gpuRef = useRef<Awaited<ReturnType<typeof initWebGPU>>>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    (async () => {
      if (!gpuRef.current) {
        const gpu = await initWebGPU(canvas);
        if (cancelled) return;
        if (!gpu) {
          setFallback(true);
          return;
        }
        gpuRef.current = gpu;
      }

      const gpu = gpuRef.current;
      if (!gpu) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
      };
      resize();
      window.addEventListener('resize', resize);

      const uniformData = new Float32Array(4);

      const frame = () => {
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        uniformData[0] = window.innerWidth * dpr;
        uniformData[1] = window.innerHeight * dpr;
        uniformData[2] = (performance.now() - startTimeRef.current) / 1000;
        uniformData[3] = 1.0; // intensity

        gpu.device.queue.writeBuffer(gpu.uniformBuffer, 0, uniformData);

        const texture = gpu.context!.getCurrentTexture();
        const encoder = gpu.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });

        pass.setPipeline(gpu.pipeline);
        pass.setBindGroup(0, gpu.bindGroup);
        pass.draw(3);
        pass.end();
        gpu.device.queue.submit([encoder.finish()]);

        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);

      return () => {
        window.removeEventListener('resize', resize);
      };
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  if (fallback) {
    return <div className="crt-overlay" aria-hidden="true" />;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 'var(--z-crt)' as unknown as number,
      }}
    />
  );
}

export default CrtShaderOverlay;
