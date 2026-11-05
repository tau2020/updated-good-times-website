/* Good Times in Cape Town — the sand journey's renderer (WebGL2, no library).

   createSandRenderer(canvas, options) → { renderAt(p), resize(width, height, pinAt), setQuality(q), checksum(),
   destroy(), quality, scene } or throws when WebGL2 or the shaders are unavailable (the controller then keeps the
   static scene). It draws only when asked: renderAt(p) is called from the GSAP ScrollTrigger update (and on resize),
   there is no loop of its own. renderAt is side-effect free with respect to the picture: it rebuilds every uniform
   from p, so the same p always gives the same frame, forwards, backwards or after a jump.

   Budget: the drawing buffer is capped (full: up to 2× device pixels and 5.4 megapixels; lite: 0.62× and 1.2 MP),
   the grain pool is fixed at creation, and destroy() deletes every GPU object and releases the context. */
import { layoutScene, stateAt, grainsAt, LIGHT } from './scene.js';
import { VERTEX, BAKE, SAND, GRAIN_VERTEX, GRAIN_FRAGMENT } from './shaders.js';

const QUALITY = {
  full: { dpr: 2, cap: 5.4e6, scale: 1 },
  lite: { dpr: 1.5, cap: 1.2e6, scale: 0.62 },
};

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`sand shader: ${log}`);
  }
  return sh;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`sand program: ${gl.getProgramInfoLog(p)}`);
  return p;
}

export function createSandRenderer(canvas, options = {}) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'default' });
  if (!gl) throw new Error('WebGL2 unavailable');
  let quality = options.quality === 'lite' ? 'lite' : 'full';
  let scene = null;
  let lastP = 0;
  let size = { width: 1, height: 1, pinAt: 0.25 };

  const sandProg = program(gl, VERTEX, SAND);
  const bakeProg = program(gl, VERTEX, BAKE);
  const grainProg = program(gl, GRAIN_VERTEX, GRAIN_FRAGMENT);

  // One triangle that covers the stage
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vaoTri = gl.createVertexArray();
  gl.bindVertexArray(vaoTri);
  for (const prog of [sandProg, bakeProg]) {
    const loc = gl.getAttribLocation(prog, 'aPos');
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  // The grain detail, baked once
  const detail = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, detail);
  gl.texStorage2D(gl.TEXTURE_2D, 11, gl.RGBA8, 1024, 1024);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, detail, 0);
  gl.viewport(0, 0, 1024, 1024);
  gl.useProgram(bakeProg);
  gl.disable(gl.BLEND);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const U = {};
  for (const name of ['uRes', 'uScale', 'uCam', 'uSteps', 'uStepA', 'uStepB', 'uStepC', 'uStepD', 'uStrokes', 'uStrokeA', 'uStrokeB', 'uRevealOn', 'uErosion', 'uClear', 'uLight', 'uFull', 'uDetail']) U[name] = gl.getUniformLocation(sandProg, name);
  const G = {};
  for (const name of ['uStage', 'uDpr', 'uShadow', 'uPass']) G[name] = gl.getUniformLocation(grainProg, name);

  // The grains: one dynamic buffer of [x, y, size, alpha, shade, height]
  const grainBuf = gl.createBuffer();
  const vaoGrain = gl.createVertexArray();
  gl.bindVertexArray(vaoGrain);
  gl.bindBuffer(gl.ARRAY_BUFFER, grainBuf);
  const aP = gl.getAttribLocation(grainProg, 'aP');
  const aS = gl.getAttribLocation(grainProg, 'aS');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 4, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(aS);
  gl.vertexAttribPointer(aS, 2, gl.FLOAT, false, 24, 16);
  gl.bindVertexArray(null);

  const stepA = new Float32Array(32);
  const stepB = new Float32Array(32);
  const stepC = new Float32Array(32);
  const stepD = new Float32Array(32);
  const strokeA = new Float32Array(64);
  const strokeB = new Float32Array(64);
  let dpr = 1;

  function resize(width, height, pinAt = size.pinAt) {
    size = { width: Math.max(1, width), height: Math.max(1, height), pinAt };
    const q = QUALITY[quality];
    dpr = Math.min(window.devicePixelRatio || 1, q.dpr) * q.scale;
    const px = size.width * size.height * dpr * dpr;
    if (px > q.cap) dpr *= Math.sqrt(q.cap / px);
    canvas.width = Math.max(1, Math.round(size.width * dpr));
    canvas.height = Math.max(1, Math.round(size.height * dpr));
    scene = layoutScene({ width: size.width, height: size.height, pinAt, quality });
    render(lastP);
  }

  function render(p) {
    if (!scene || gl.isContextLost()) return;
    lastP = p;
    const st = stateAt(scene, p);
    const sc = scene.s * (canvas.width / size.width);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(sandProg);
    gl.bindVertexArray(vaoTri);
    gl.disable(gl.BLEND);
    scene.steps.forEach((s, i) => {
      const e = st.steps[i];
      stepA.set([s.c[0], s.c[1], s.h[0], s.h[1]], i * 4);
      stepB.set([s.sigma, s.v.length, s.v.width, s.depth], i * 4);
      stepC.set([e.heel, e.fore, e.toes, s.v.spread], i * 4);
      stepD.set([s.v.heelBias, s.v.fifth, (s.seed % 997) * 0.37, e.active && e.heel > 0 ? 1 : 0], i * 4);
    });
    scene.strokes.forEach((s, j) => {
      strokeA.set([s.O[0], s.O[1], s.R, s.a0], j * 4);
      strokeB.set([s.dA, s.width, st.strokes[j], 0], j * 4);
    });
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uScale, sc);
    gl.uniform2f(U.uCam, st.cam[0], st.cam[1]);
    gl.uniform1i(U.uSteps, scene.steps.length);
    gl.uniform4fv(U.uStepA, stepA);
    gl.uniform4fv(U.uStepB, stepB);
    gl.uniform4fv(U.uStepC, stepC);
    gl.uniform4fv(U.uStepD, stepD);
    gl.uniform1i(U.uStrokes, scene.strokes.length);
    gl.uniform4fv(U.uStrokeA, strokeA);
    gl.uniform4fv(U.uStrokeB, strokeB);
    gl.uniform1f(U.uRevealOn, st.revealOn ? 1 : 0);
    gl.uniform1f(U.uErosion, st.erosion);
    gl.uniform1f(U.uClear, st.clear ? 1 : 0);
    gl.uniform3f(U.uLight, LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform1f(U.uFull, quality === 'full' ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, detail);
    gl.uniform1i(U.uDetail, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The grains in flight: their shadows first, then the grains
    const g = grainsAt(scene, st.p, st.cam);
    const count = g.length / 6;
    if (count) {
      gl.useProgram(grainProg);
      gl.bindVertexArray(vaoGrain);
      gl.bindBuffer(gl.ARRAY_BUFFER, grainBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g), gl.DYNAMIC_DRAW);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(G.uStage, size.width, size.height);
      gl.uniform1f(G.uDpr, canvas.width / size.width);
      gl.uniform2f(G.uShadow, -LIGHT[0] / LIGHT[2], -LIGHT[1] / LIGHT[2]);
      gl.uniform1f(G.uPass, 0);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.uniform1f(G.uPass, 1);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }

  /** A checksum of the frame just drawn at p (same task, so the buffer is intact): the determinism tests. */
  function checksum(p) {
    render(p);
    const w = canvas.width;
    const h = canvas.height;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let a = 0x811c9dc5;
    let alpha = 0;
    for (let i = 0; i < px.length; i += 4) {
      a = Math.imul(a ^ px[i] ^ (px[i + 1] << 8) ^ (px[i + 2] << 16) ^ (px[i + 3] << 24), 16777619) >>> 0;
      alpha += px[i + 3];
    }
    return { hash: a.toString(16), meanAlpha: alpha / (px.length / 4) / 255, width: w, height: h };
  }

  function destroy() {
    gl.deleteProgram(sandProg);
    gl.deleteProgram(bakeProg);
    gl.deleteProgram(grainProg);
    gl.deleteBuffer(tri);
    gl.deleteBuffer(grainBuf);
    gl.deleteVertexArray(vaoTri);
    gl.deleteVertexArray(vaoGrain);
    gl.deleteTexture(detail);
    scene = null;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  return {
    gl,
    get quality() {
      return quality;
    },
    get scene() {
      return scene;
    },
    get p() {
      return lastP;
    },
    renderAt: render,
    resize,
    checksum,
    setQuality(q) {
      if (q === quality || !QUALITY[q]) return;
      quality = q;
      resize(size.width, size.height, size.pinAt);
    },
    destroy,
  };
}
