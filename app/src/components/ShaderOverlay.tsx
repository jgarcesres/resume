import { useEffect, useRef, useState } from 'react';
import vertexSource from '../shaders/vertex.wgsl?raw';
import crtSource from '../shaders/crt.wgsl?raw';
import bloomSource from '../shaders/bloom.wgsl?raw';
import chromaticSource from '../shaders/chromatic.wgsl?raw';
import retroSource from '../shaders/retro.wgsl?raw';
import matrixSource from '../shaders/matrix.wgsl?raw';
import type { ShaderPreset } from '../hooks/useShaderPreset';

const FRAGMENT_SOURCES: Record<Exclude<ShaderPreset, 'none'>, string> = {
  crt: crtSource,
  bloom: bloomSource,
  chromatic: chromaticSource,
  retro: retroSource,
  matrix: matrixSource,
};

// Uniform buffer layout: vec2f resolution + f32 time + f32 intensity + f32 cssWidth + 3x pad = 32 bytes.
const UNIFORM_BYTES = 32;

interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  uniformBuffer: GPUBuffer;
  bindGroupLayout: GPUBindGroupLayout;
  bindGroup: GPUBindGroup;
  vertexModule: GPUShaderModule;
  fragmentModules: Map<string, GPUShaderModule>;
  pipelines: Map<string, GPURenderPipeline>;
}

async function initGpu(canvas: HTMLCanvasElement): Promise<GpuContext | null> {
  if (!navigator.gpu) return null;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) return null;

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTES,
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

  const vertexModule = device.createShaderModule({ code: vertexSource });

  return {
    device,
    context,
    format,
    uniformBuffer,
    bindGroupLayout,
    bindGroup,
    vertexModule,
    fragmentModules: new Map(),
    pipelines: new Map(),
  };
}

function getOrBuildPipeline(gpu: GpuContext, preset: Exclude<ShaderPreset, 'none'>): GPURenderPipeline {
  const cached = gpu.pipelines.get(preset);
  if (cached) return cached;

  let fragmentModule = gpu.fragmentModules.get(preset);
  if (!fragmentModule) {
    fragmentModule = gpu.device.createShaderModule({ code: FRAGMENT_SOURCES[preset] });
    gpu.fragmentModules.set(preset, fragmentModule);
  }

  const pipeline = gpu.device.createRenderPipeline({
    layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [gpu.bindGroupLayout] }),
    vertex: { module: gpu.vertexModule, entryPoint: 'vs' },
    fragment: {
      module: fragmentModule,
      entryPoint: 'fs',
      targets: [{
        format: gpu.format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });
  gpu.pipelines.set(preset, pipeline);
  return pipeline;
}

const TOAST_PRESET_LABELS: Record<Exclude<ShaderPreset, 'none' | 'crt'>, string> = {
  bloom: 'Bloom',
  chromatic: 'Chromatic',
  retro: 'Retro',
  matrix: 'Matrix',
};

interface ShaderOverlayProps {
  preset: ShaderPreset;
}

function ShaderOverlay({ preset }: ShaderOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRef = useRef<GpuContext | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(performance.now());
  const pipelineRef = useRef<GPURenderPipeline | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (preset === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let resizeHandler: (() => void) | null = null;

    (async () => {
      if (!gpuRef.current && !unavailable) {
        const gpu = await initGpu(canvas);
        if (cancelled) return;
        if (!gpu) {
          setUnavailable(true);
          return;
        }
        gpuRef.current = gpu;

        gpu.device.lost.then((info) => {
          console.warn('WebGPU device lost:', info.message);
          gpuRef.current = null;
          setUnavailable(true);
        });
      }

      const gpu = gpuRef.current;
      if (!gpu) return;

      pipelineRef.current = getOrBuildPipeline(gpu, preset);

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gpu.context.configure({
          device: gpu.device,
          format: gpu.format,
          alphaMode: 'premultiplied',
        });
      };
      resize();
      window.addEventListener('resize', resize);
      resizeHandler = resize;

      const uniformData = new Float32Array(UNIFORM_BYTES / 4);

      const frame = () => {
        if (cancelled) return;
        const pipeline = pipelineRef.current;
        if (!pipeline) {
          rafRef.current = requestAnimationFrame(frame);
          return;
        }

        const dpr = window.devicePixelRatio || 1;
        uniformData[0] = window.innerWidth * dpr;
        uniformData[1] = window.innerHeight * dpr;
        uniformData[2] = (performance.now() - startTimeRef.current) / 1000;
        uniformData[3] = 1.0;
        uniformData[4] = window.innerWidth;

        gpu.device.queue.writeBuffer(gpu.uniformBuffer, 0, uniformData);

        const texture = gpu.context.getCurrentTexture();
        const encoder = gpu.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });

        pass.setPipeline(pipeline);
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
    };
  }, [preset, unavailable]);

  // Destroy the GPU device only when the overlay unmounts (e.g. leaving RPG
  // mode). Pipeline swaps between presets share the same device.
  useEffect(() => {
    return () => {
      if (gpuRef.current) {
        gpuRef.current.device.destroy();
        gpuRef.current = null;
      }
    };
  }, []);

  // Show a toast when a non-CRT preset is picked but WebGPU is unavailable.
  useEffect(() => {
    if (!unavailable) { setToast(null); return; }
    if (preset === 'none' || preset === 'crt') { setToast(null); return; }
    const label = TOAST_PRESET_LABELS[preset];
    setToast(`${label} effect needs WebGPU — not available in this browser.`);
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [preset, unavailable]);

  if (preset === 'none') return null;

  // CSS fallback for CRT only.
  if (unavailable && preset === 'crt') {
    return <div className="crt-overlay" aria-hidden="true" />;
  }

  return (
    <>
      {!unavailable && (
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
      )}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 max-w-xs px-3 py-2 font-pixel text-[9px] uppercase tracking-wider text-rpg-text bg-rpg-deep border-2 border-rpg-border shadow-[4px_4px_0_rgba(0,0,0,0.6)]"
          style={{ zIndex: 'var(--z-crt)' as unknown as number }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default ShaderOverlay;
