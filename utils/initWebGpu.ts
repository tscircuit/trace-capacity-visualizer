
/// <reference types="@webgpu/types" />

export async function initWebGpu(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported")
  }

  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error("No Adapter Found")
  }
  const device = await adapter.requestDevice()

  const context = canvas.getContext("webgpu")
  if (!context) {
    throw new Error("Could not get WebGPU context")
  }

  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  })

  return { device, context, format }
}
