// Draws many textured quads in one WebGL call onto a hidden canvas, then
// stamps the result onto a 2D canvas with one drawImage. Hundreds of
// separate drawImage calls cost the main thread ~6µs each on a phone; a batch
// costs about one. Instances are in the 2D canvas's own device pixels, so the
// caller's transform, clip and draw order around the batch all still hold.
// Returns false (draw nothing) when WebGL2 isn't available or was lost: the
// caller then draws the 2D way

// floats per instance: center x/y, half-width axis x/y, half-height axis
// x/y, texture rect u0/v0/u1/v1, alpha
export const SPRITE_FLOATS = 11;

export interface SpriteTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
}

interface Gl {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  gl: WebGL2RenderingContext;
  vao: WebGLVertexArrayObject;
  instances: WebGLBuffer;
  capacity: number;
  resolution: WebGLUniformLocation;
}

let shared: Gl | null = null;
let failed = false;

const VERTEX = `#version 300 es
in vec2 corner;
in vec2 center;
in vec4 axes;
in vec4 rect;
in float alpha;
uniform vec2 resolution;
out vec2 uv;
out float shade;
void main() {
  vec2 k = corner * 2.0 - 1.0;
  vec2 p = center + k.x * axes.xy + k.y * axes.zw;
  uv = mix(rect.xy, rect.zw, corner);
  shade = alpha;
  gl_Position = vec4(p.x / resolution.x * 2.0 - 1.0, 1.0 - p.y / resolution.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec2 uv;
in float shade;
uniform sampler2D sheet;
out vec4 color;
void main() {
  color = texture(sheet, uv) * shade;
}`;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function getGl(): Gl | null {
  if (shared || failed) return shared;
  // offscreen, the batch hands its pixels over (transferToImageBitmap)
  // instead of the 2D canvas copying the whole WebGL canvas every stamp
  const canvas =
    typeof OffscreenCanvas === "undefined"
      ? document.createElement("canvas")
      : new OffscreenCanvas(1, 1);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  }) as WebGL2RenderingContext | null;
  if (!gl) {
    failed = true;
    return null;
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    failed = true;
    return null;
  }
  gl.useProgram(program);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const corner = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  const instances = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  const stride = SPRITE_FLOATS * 4;
  const attribute = (name: string, size: number, offset: number) => {
    const at = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, gl.FLOAT, false, stride, offset * 4);
    gl.vertexAttribDivisor(at, 1);
  };
  attribute("center", 2, 0);
  attribute("axes", 4, 2);
  attribute("rect", 4, 6);
  attribute("alpha", 1, 10);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(0, 0, 0, 0);
  canvas.addEventListener("webglcontextlost", () => {
    shared = null;
    failed = true;
  });
  shared = {
    canvas,
    gl,
    vao,
    instances,
    capacity: 0,
    resolution: gl.getUniformLocation(program, "resolution")!,
  };
  return shared;
}

// a texture of image with mipmaps, so sprites drawn small stay smooth; null
// without WebGL2
export function createSpriteTexture(
  image: TexImageSource & { width: number; height: number },
): SpriteTexture | null {
  const g = getGl();
  if (!g) return null;
  const { gl } = g;
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, width: image.width, height: image.height };
}

// draws count instances from data onto ctx's canvas, inside the device-pixel
// box (left, top, right, bottom) they cover, with ctx's clip and composite.
// False if WebGL isn't there to do it
export function drawSprites(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteTexture,
  data: Float32Array,
  count: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const g = shared;
  if (!g || g.gl.isContextLost()) return false;
  const { gl, canvas } = g;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  const w = Math.min(width, Math.ceil(right)) - x;
  const h = Math.min(height, Math.ceil(bottom)) - y;
  if (count === 0 || w <= 0 || h <= 0) return true;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, width, height);
  gl.uniform2f(g.resolution, width, height);
  // GL counts rows from the bottom
  gl.scissor(x, height - y - h, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindVertexArray(g.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.instances);
  const floats = count * SPRITE_FLOATS;
  if (g.capacity < floats) {
    g.capacity = Math.max(floats, g.capacity * 2);
    gl.bufferData(gl.ARRAY_BUFFER, g.capacity * 4, gl.DYNAMIC_DRAW);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, floats);
  gl.bindTexture(gl.TEXTURE_2D, sheet.texture);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (canvas instanceof HTMLCanvasElement)
    ctx.drawImage(canvas, x, y, w, h, x, y, w, h);
  else {
    const bitmap = canvas.transferToImageBitmap();
    ctx.drawImage(bitmap, x, y, w, h, x, y, w, h);
    bitmap.close();
  }
  ctx.restore();
  return true;
}
