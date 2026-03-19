import { useEffect, useRef, useState } from 'react';

const CRT_SHADER = /* wgsl */ `
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
  // Wider scanlines on mobile (fewer pixels = need thicker lines to be visible)
  let scanScale = select(1.0, 2.0, u.cssWidth < 768.0);
  let scanY = uv.y * u.resolution.y / scanScale;
  let scanPhase = scanY + t * 30.0;
  let scanline = sin(scanPhase * 3.14159 / 2.0);
  let scanAlpha = scanline * scanline * 0.15 * intensity;
  alpha += scanAlpha;

  // ── Phosphor dot pattern (RGB sub-pixel simulation) ──
  // Larger phosphor cells on mobile so they're visible
  let phosphorScale = select(3.0, 5.0, u.cssWidth < 768.0);
  let px = floor(uv * u.resolution / phosphorScale);
  let subpx = (uv * u.resolution / phosphorScale - px) * phosphorScale;
  let col = i32(px.x) % 3;
  var phosphor = vec3f(0.0);
  if (col == 0) { phosphor = vec3f(1.0, 0.0, 0.0); }
  else if (col == 1) { phosphor = vec3f(0.0, 1.0, 0.0); }
  else { phosphor = vec3f(0.0, 0.0, 1.0); }
  let phosphorMask = smoothstep(0.0, 1.0, length(subpx - vec2f(phosphorScale * 0.5)));
  color += phosphor * phosphorMask * 0.05 * intensity;
  alpha += phosphorMask * 0.03 * intensity;

  // ── Vignette ── (stronger on mobile for that small-screen CRT feel)
  let center = uv - 0.5;
  let dist = length(center);
  let vignetteStrength = select(0.5, 0.7, u.cssWidth < 768.0);
  let vignette = smoothstep(0.3, 0.85, dist) * vignetteStrength * intensity;
  alpha += vignette;

  // ── Subtle flicker ──
  let flicker = sin(t * 8.0) * sin(t * 13.7) * 0.012 * intensity;
  alpha += flicker;

  // ── Moving scan band (like a slow refresh line) ──
  let bandPos = fract(t * 0.05);
  let bandDist = abs(uv.y - bandPos);
  let bandStrength = select(0.06, 0.10, u.cssWidth < 768.0);
  let band = smoothstep(0.06, 0.0, bandDist) * bandStrength * intensity;
  alpha += band;

  // ── Screen edge glow ──
  let edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  let edgeGlow = smoothstep(0.02, 0.0, edgeDist) * 0.15 * intensity;
  color += vec3f(0.0, 0.9, 1.0) * edgeGlow; // cyan edge glow
  alpha += edgeGlow;

  // Clamp alpha
  alpha = clamp(alpha, 0.0, 0.65);

  // Premultiply RGB by alpha (required by premultiplied alphaMode)
  return vec4f(color * alpha, alpha);
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
    size: 32, // vec2f resolution + f32 time + f32 intensity + f32 cssWidth + 3x padding = 32 bytes
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
    let resizeHandler: (() => void) | null = null;

    (async () => {
      if (!gpuRef.current) {
        const gpu = await initWebGPU(canvas);
        if (cancelled) return;
        if (!gpu) {
          setFallback(true);
          return;
        }
        gpuRef.current = gpu;

        // Handle device loss — fall back to CSS overlay
        gpu.device.lost.then((info) => {
          console.warn('WebGPU device lost:', info.message);
          gpuRef.current = null;
          setFallback(true);
        });
      }

      const gpu = gpuRef.current;
      if (!gpu) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        // Re-configure context after canvas size change
        gpu.context!.configure({
          device: gpu.device,
          format: gpu.format,
          alphaMode: 'premultiplied',
        });
      };
      resize();
      window.addEventListener('resize', resize);
      resizeHandler = resize;

      const uniformData = new Float32Array(8);

      const frame = () => {
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        uniformData[0] = window.innerWidth * dpr;  // physical resolution X
        uniformData[1] = window.innerHeight * dpr;  // physical resolution Y
        uniformData[2] = (performance.now() - startTimeRef.current) / 1000;
        uniformData[3] = 1.0;                       // intensity
        uniformData[4] = window.innerWidth;          // CSS pixel width (for breakpoints)

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
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (gpuRef.current) {
        gpuRef.current.device.destroy();
        gpuRef.current = null;
      }
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
