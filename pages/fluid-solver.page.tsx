/// <reference types="@webgpu/types" />
import { useEffect, useRef, useState } from "react";
import type { SimpleRouteJson } from "../lib/types";
import data from "../test-assets/srj_1.json";
import { createGridContext } from "../utils/createGridContext";
import { createVoxelGridData } from "../utils/createVoxelGridData";
import { initWebGpu } from "../utils/initWebGpu";
import { FS_CODE, VS_CODE } from "../utils/solverShaders";

const srj = data as unknown as SimpleRouteJson;

const Page = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Initializing...");
  const [layerIndex, setLayerIndex] = useState(0);
  const [maxLayer, setMaxLayer] = useState(0);
  
  // Refs for WebGPU objects to persist across renders/layer updates
  const deviceRef = useRef<GPUDevice | null>(null);
  const uniformBufferRef = useRef<GPUBuffer | null>(null);
  const renderRef = useRef<() => void>(null);

  useEffect(() => {
    const start = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const { device, context, format } = await initWebGpu(canvas);
        deviceRef.current = device;

        // 1. Prepare Data
        const resolution = 0.1;
        const ctx = createGridContext(srj, { resolution });
        const voxelData = createVoxelGridData(srj, ctx);
        
        setMaxLayer(ctx.layerCount - 1);
        setStatus(`Grid: ${ctx.widthCells}x${ctx.heightCells}x${ctx.layerCount} (Res: ${resolution})`);

        // Set Canvas Size (Display)
        // We fix the display size, but the internal resolution matches the grid (scaled)
        const displayScale = 4;
        canvas.width = ctx.widthCells * displayScale;
        canvas.height = ctx.heightCells * displayScale;

        // 2. Create 3D Texture
        const texture = device.createTexture({
          size: [ctx.widthCells, ctx.heightCells, ctx.layerCount || 1],
          format: 'r8uint',
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        device.queue.writeTexture(
          { texture },
          voxelData as unknown as BufferSource,
          { bytesPerRow: ctx.widthCells, rowsPerImage: ctx.heightCells },
          { width: ctx.widthCells, height: ctx.heightCells, depthOrArrayLayers: ctx.layerCount || 1 }
        );

        // 3. Create Uniform Buffer for Layer Index
        const uniformBuffer = device.createBuffer({
          size: 16, // Min alignment
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformBufferRef.current = uniformBuffer;

        // 4. Pipeline
        const pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: {
            module: device.createShaderModule({ code: VS_CODE }),
            entryPoint: 'main',
          },
          fragment: {
            module: device.createShaderModule({ code: FS_CODE }),
            entryPoint: 'main',
            targets: [{ format }],
          },
          primitive: { topology: 'triangle-list' },
        });

        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: texture.createView() },
            { binding: 1, resource: { buffer: uniformBuffer } }
          ],
        });

        const render = () => {
          const enc = device.createCommandEncoder();
          const pass = enc.beginRenderPass({
            colorAttachments: [{
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1 },
              loadOp: 'clear',
              storeOp: 'store',
            }]
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);
          pass.end();
          device.queue.submit([enc.finish()]);
        };

        renderRef.current = render;
        render(); // Initial draw
        
      } catch (e: any) {
        setStatus(`Error: ${e.message}`);
      }
    };

    start();
  }, []);

  // Update Layer Uniform when state changes
  useEffect(() => {
    if (!deviceRef.current || !uniformBufferRef.current || !renderRef.current) return;
    
    const data = new Uint32Array([layerIndex]);
    deviceRef.current.queue.writeBuffer(uniformBufferRef.current, 0, data);
    
    renderRef.current(); // Re-render
  }, [layerIndex]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      fontFamily: 'system-ui, sans-serif',
      color: '#333',
      background: '#f5f5f5'
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', background: 'white' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>WebGPU Fluid Solver</h1>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.9rem' }}>
          <span>Status: <strong>{status}</strong></span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label>Layer:</label>
            <input 
              type="number" 
              min="0" 
              max={maxLayer} 
              step="1"
              value={layerIndex} 
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= maxLayer) {
                  setLayerIndex(val);
                }
              }}
              style={{ width: '60px', padding: '4px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '2rem'
      }}>
        <div style={{ 
          border: '1px solid #999', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          background: 'black',
          lineHeight: 0 
        }}>
          <canvas ref={canvasRef} style={{ imageRendering: "pixelated", maxWidth: '100%', maxHeight: '80vh' }} />
        </div>
      </div>
    </div>
  );
};

export default Page;