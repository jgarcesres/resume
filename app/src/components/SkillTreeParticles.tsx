import { useEffect, useRef } from 'react';
import computeSource from '../shaders/particles_compute.wgsl?raw';
import renderSource from '../shaders/particles_render.wgsl?raw';

interface NodeLike {
  id: string;
  x: number;
  y: number;
}

interface EdgeLike {
  from: string;
  to: string;
}

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

interface Props {
  sizeRef: React.MutableRefObject<{ width: number; height: number }>;
  nodesRef: React.MutableRefObject<NodeLike[]>;
  edges: EdgeLike[];
  pointerRef: React.MutableRefObject<PointerState>;
  revealProgressRef: React.MutableRefObject<number>;
  isRpgRef: React.MutableRefObject<boolean>;
  particleCount?: number;
}

// Particle struct: 8 f32s = 32 bytes.
const PARTICLE_STRIDE = 32;
// Uniforms: 48 bytes (see WGSL).
const UBO_SIZE = 48;

function SkillTreeParticles({
  sizeRef,
  nodesRef,
  edges,
  pointerRef,
  revealProgressRef,
  isRpgRef,
  particleCount = 3072,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!navigator.gpu) return;

    let cancelled = false;
    let rafId = 0;
    let device: GPUDevice | null = null;

    (async () => {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter || cancelled) return;
      device = await adapter.requestDevice();
      if (cancelled) {
        device.destroy();
        device = null;
        return;
      }

      const ctx = canvas.getContext('webgpu');
      if (!ctx) return;
      const format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: 'premultiplied' });

      device.lost.then((info) => {
        if (info.reason === 'destroyed') return;
        console.warn('[SkillTreeParticles] device lost:', info.message);
      });

      // Build id -> index map from the nodes array (stable order == array index).
      const nodes = nodesRef.current;
      const idToIdx = new Map<string, number>();
      nodes.forEach((n, i) => idToIdx.set(n.id, i));
      const nNodes = nodes.length;

      const edgePairs: [number, number][] = [];
      for (const e of edges) {
        const a = idToIdx.get(e.from);
        const b = idToIdx.get(e.to);
        if (a !== undefined && b !== undefined) edgePairs.push([a, b]);
      }
      const nEdges = edgePairs.length;
      if (nNodes === 0 || nEdges === 0) return;

      const { width, height } = sizeRef.current;

      const particleBuf = device.createBuffer({
        size: PARTICLE_STRIDE * particleCount,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const initData = new Float32Array(particleCount * 8);
      for (let i = 0; i < particleCount; i++) {
        const o = i * 8;
        initData[o + 0] = Math.random() * width;
        initData[o + 1] = Math.random() * height;
        initData[o + 2] = 0;
        initData[o + 3] = 0;
        initData[o + 4] = Math.floor(Math.random() * nEdges);
        initData[o + 5] = Math.random();
        initData[o + 6] = -Math.random() * 1.5;
        initData[o + 7] = Math.random();
      }
      device.queue.writeBuffer(particleBuf, 0, initData);

      const nodesBuf = device.createBuffer({
        size: Math.max(16, nNodes * 8),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const edgesBuf = device.createBuffer({
        size: Math.max(16, nEdges * 8),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      const edgeData = new Uint32Array(nEdges * 2);
      edgePairs.forEach(([a, b], i) => {
        edgeData[i * 2] = a;
        edgeData[i * 2 + 1] = b;
      });
      device.queue.writeBuffer(edgesBuf, 0, edgeData);

      const uboBuf = device.createBuffer({
        size: UBO_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const computeBGL = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        ],
      });
      const computeBG = device.createBindGroup({
        layout: computeBGL,
        entries: [
          { binding: 0, resource: { buffer: particleBuf } },
          { binding: 1, resource: { buffer: nodesBuf } },
          { binding: 2, resource: { buffer: edgesBuf } },
          { binding: 3, resource: { buffer: uboBuf } },
        ],
      });
      const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
        compute: {
          module: device.createShaderModule({ code: computeSource }),
          entryPoint: 'main',
        },
      });

      const renderBGL = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'read-only-storage' },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ],
      });
      const renderBG = device.createBindGroup({
        layout: renderBGL,
        entries: [
          { binding: 0, resource: { buffer: particleBuf } },
          { binding: 1, resource: { buffer: uboBuf } },
        ],
      });
      const renderModule = device.createShaderModule({ code: renderSource });
      const renderPipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: {
          module: renderModule,
          entryPoint: 'fs',
          targets: [{
            format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
            },
          }],
        },
        primitive: { topology: 'triangle-list' },
      });

      const workgroups = Math.ceil(particleCount / 64);

      // Resize observer — match canvas backing store to current size in device px.
      let currentW = width;
      let currentH = height;
      const syncCanvasSize = () => {
        const s = sizeRef.current;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(s.width * dpr));
        const h = Math.max(1, Math.round(s.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          if (device) {
            ctx.configure({ device, format, alphaMode: 'premultiplied' });
          }
        }
        currentW = s.width;
        currentH = s.height;
      };
      syncCanvasSize();

      const nodesData = new Float32Array(Math.max(2, nNodes * 2));
      const ubo = new ArrayBuffer(UBO_SIZE);
      const uboF = new Float32Array(ubo);
      const uboU = new Uint32Array(ubo);

      let lastTime = performance.now();

      const frame = (now: number) => {
        if (cancelled || !device) return;
        syncCanvasSize();

        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const liveNodes = nodesRef.current;
        for (let i = 0; i < nNodes; i++) {
          const n = liveNodes[i];
          nodesData[i * 2] = n ? n.x : 0;
          nodesData[i * 2 + 1] = n ? n.y : 0;
        }
        device.queue.writeBuffer(nodesBuf, 0, nodesData);

        const p = pointerRef.current;
        // Coordinates in CSS pixels — matches particle-space / node-space.
        uboF[0] = currentW;
        uboF[1] = currentH;
        uboF[2] = p.x;
        uboF[3] = p.y;
        uboF[4] = now / 1000;
        uboF[5] = dt;
        uboF[6] = p.active ? 1 : 0;
        uboF[7] = revealProgressRef.current;
        uboF[8] = isRpgRef.current ? 1 : 0;
        uboU[9] = nNodes;
        uboU[10] = nEdges;
        uboF[11] = 0;
        device.queue.writeBuffer(uboBuf, 0, ubo);

        const encoder = device.createCommandEncoder();
        const cpass = encoder.beginComputePass();
        cpass.setPipeline(computePipeline);
        cpass.setBindGroup(0, computeBG);
        cpass.dispatchWorkgroups(workgroups);
        cpass.end();

        const texture = ctx.getCurrentTexture();
        const rpass = encoder.beginRenderPass({
          colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });
        rpass.setPipeline(renderPipeline);
        rpass.setBindGroup(0, renderBG);
        rpass.draw(6, particleCount);
        rpass.end();

        device.queue.submit([encoder.finish()]);
        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);
    })().catch((err) => {
      if (!cancelled) console.warn('[SkillTreeParticles] init failed:', err);
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (device) {
        device.destroy();
        device = null;
      }
    };
    // The refs + edges list are stable for the lifetime of the parent effect;
    // intentionally empty deps so we don't tear down and re-init on every render.

  }, [edges, sizeRef, nodesRef, pointerRef, revealProgressRef, isRpgRef, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

export default SkillTreeParticles;
