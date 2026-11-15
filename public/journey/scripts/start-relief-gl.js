// Immersive-g.com homepage relief, set up the way their site does it, on a fixed page (no scroll).
// Model: webgl/reliefs.glb (their reliefs_high_compressed.glb). Shaders: start-relief-shaders.js (verbatim).
// Their textures txt/plaster and txt/mask-noise were not in the archive, so both are generated below.
import * as THREE from '../webgl/three/three.module.min.js';
import { GLTFLoader } from '../webgl/three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from '../webgl/three/addons/loaders/DRACOLoader.js';
import { flowmapFrag, flowmapVert, reliefFrag, reliefVert, wallFrag, wallVert } from './start-relief-shaders.js';

const MODEL_URL = new URL('../webgl/reliefs.glb', import.meta.url).href;
const DRACO_URL = new URL('../webgl/three/draco/', import.meta.url).href;

// Their "relief" config.
const CONFIG = {
    flowmap: { mouseEase: 0.4, dissipation: 0.953, falloff: 0.38, alpha: 1 },
    extrude: { textureStrength: 1, gradientStrength: 0.17 },
    camera: { fov: 30, distance: 15, zoom: 1, near: 5, far: 20 }
};
const SECTION_HEIGHT = 9.995; // Hv
const VIEW_SCALE = 1.33;      // CB

// Their define helper writes numbers with 4 decimals and {min,max} as vec2.
const f = (n) => n.toFixed(4);
const RELIEF_DEFINES = {
    EFFECT_AMPLITUDE: f(0.57),
    EFFECT_SHADOW_STRENGTH: f(0.3),
    EFFECT_FLUID_MAGNITUDE: f(0.15),
    EFFECT_FLUID_RED_COEF: f(2),
    EFFECT_FLUID_GREEN_COEF: f(1),
    EFFECT_FLUID_BLUE_COEF: f(1.5),
    EFFECT_LINES_SPEED: f(2),
    EFFECT_LINES_SCALE: f(4),
    EFFECT_LINES_STRENGTH: f(0),
    EFFECT_LINES_WAVE_LENGTH: f(0.15),
    EFFECT_BASE_COLOR: `vec3(${f(122 / 255)},${f(191 / 255)},${f(197 / 255)})`,
    EFFECT_BASE_THRESHOLD: f(1),
    EFFECT_HUE_SHIFT: f(-0.52),
    EFFECT_COLOR_RANGE: f(2),
    CHROMATIC_FRESNEL_SHARPNESS: f(35),
    CHROMATIC_FRESNEL_OPACITY: f(0.98),
    CHROMATIC_SHADOW_RANGE: `vec2(${f(0.2)},${f(0.42)})`,
    CHROMATIC_SHADOW_OPACITY: f(0.25),
    SCROLL_EXTRUDE_NOISE_SIZE: f(7.77),
    SCROLL_EXTRUDE_SPEED: f(2),
    SCROLL_EXTRUDE_MASK: `vec2(${f(-1)},${f(1)})`,
    SCROLL_EXTRUDE_STRENGTH: f(1.02)
};

/* ---------- generated stand-ins for their noise and plaster textures ---------- */

function makeNoiseTexture(size, seed, octaves) {
    let s = seed >>> 0;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    // Tileable value noise per channel.
    const grids = [0, 1, 2].map(() => {
        const g = [];
        for (let o = 0; o < octaves; o++) {
            const n = 4 << o;
            const cells = new Float32Array(n * n);
            for (let i = 0; i < cells.length; i++) cells[i] = rand();
            g.push({ n, cells });
        }
        return g;
    });
    const smooth = (t) => t * t * (3 - 2 * t);
    const sample = (layer, x, y) => {
        const { n, cells } = layer;
        const fx = x * n, fy = y * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = smooth(fx - x0), ty = smooth(fy - y0);
        const at = (i, j) => cells[((j % n + n) % n) * n + ((i % n + n) % n)];
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        return a + (b - a) * ty;
    };
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            for (let c = 0; c < 3; c++) {
                let v = 0, amp = 0.5, total = 0;
                for (const layer of grids[c]) {
                    v += sample(layer, x / size, y / size) * amp;
                    total += amp;
                    amp *= 0.5;
                }
                data[i + c] = Math.round((v / total) * 255);
            }
            data[i + 3] = 255;
        }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}

function makePlasterTexture(size) {
    // Mostly white with soft blotches, trowel streaks and fine pits; the shader multiplies the wall by .g.
    const noise = makeNoiseTexture(size, 91, 6).image.data;
    const fine = makeNoiseTexture(size, 7, 3).image.data;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const blotch = noise[i * 4] / 255;
        const streak = noise[i * 4 + 1] / 255;
        const pit = fine[i * 4 + 2] / 255;
        let v = 1 - 0.07 * Math.max(0, blotch - 0.35) - 0.04 * Math.abs(streak - 0.5) - 0.06 * Math.max(0, pit - 0.7) * 3;
        v = Math.max(0.82, Math.min(1, v));
        const g = Math.round(v * 255);
        data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = g;
        data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}

/* ---------- their fullscreen triangle (Vy) ---------- */

function fullscreenTriangle() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    return g;
}

/* ---------- their flowmap (E_e) ---------- */

class Flowmap {
    constructor(renderer, { size = 256, falloff = 0.5, alpha = 0.3, dissipation = 0.98, tNoise, uTime }) {
        this.renderer = renderer;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        const opts = { type: THREE.HalfFloatType, depthBuffer: false };
        this.read = new THREE.WebGLRenderTarget(size, size, opts);
        this.write = new THREE.WebGLRenderTarget(size, size, opts);
        this.uniform = { value: this.read.texture };
        this.aspect = 1;
        this.mouse = new THREE.Vector2(-1, -1);
        this.velocity = new THREE.Vector2();
        this.mouse2 = new THREE.Vector2(-1, -1);
        this.velocity2 = new THREE.Vector2();
        this.material = new THREE.RawShaderMaterial({
            vertexShader: flowmapVert,
            fragmentShader: flowmapFrag,
            uniforms: {
                tMap: this.uniform,
                uFalloff: { value: falloff * 0.5 },
                uAlpha: { value: alpha },
                uDissipation: { value: dissipation },
                uDeltaMult: { value: 1 },
                tNoise,
                uTime,
                uAspect: { value: 1 },
                uMouse: { value: this.mouse },
                uVelocity: { value: this.velocity },
                uMouse2: { value: this.mouse2 },
                uVelocity2: { value: this.velocity2 },
                uOffset: { value: 0 }
            },
            depthTest: false
        });
        this.mesh = new THREE.Mesh(fullscreenTriangle(), this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }
    tick(deltaMs) {
        this.material.uniforms.uDeltaMult.value = Math.min(deltaMs, 32) / 16;
    }
    update(offset = 0) {
        this.material.uniforms.uAspect.value = this.aspect;
        this.material.uniforms.uOffset.value = offset;
        const prev = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.write);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(prev);
        const t = this.read;
        this.read = this.write;
        this.write = t;
        this.uniform.value = this.read.texture;
    }
    dispose() {
        this.read.dispose();
        this.write.dispose();
        this.material.dispose();
        this.mesh.geometry.dispose();
    }
}

/* ---------- their pointer tracker (Kge): normalFlip + per-frame velocity ---------- */

class Pointer {
    constructor() {
        this.normalFlip = new THREE.Vector2(-1, -1);
        this.lastNormalFlip = new THREE.Vector2(-1, -1);
        this.velocity = new THREE.Vector2();
        this.onMove = (e) => {
            this.normalFlip.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
        };
        window.addEventListener('pointerdown', this.onMove, { passive: true });
        window.addEventListener('pointermove', this.onMove, { passive: true });
    }
    tick(deltaMs) {
        if (this.lastNormalFlip.x === -1) this.lastNormalFlip.copy(this.normalFlip);
        const dx = this.normalFlip.x - this.lastNormalFlip.x;
        const dy = this.normalFlip.y - this.lastNormalFlip.y;
        this.lastNormalFlip.copy(this.normalFlip);
        const r = Math.min(32, deltaMs) / 16;
        this.velocity.set(dx * r, dy * r);
    }
    dispose() {
        window.removeEventListener('pointerdown', this.onMove);
        window.removeEventListener('pointermove', this.onMove);
    }
}

/* ---------- their random "ghost" pointer (triggerRandomMouseMovement), without GSAP ---------- */

class GhostPointer {
    constructor(target, velocity) {
        this.target = target;
        this.velocity = velocity;
        this.plan = null;
    }
    lerp(a, b, t) { return a + (b - a) * t; }
    directions(start) {
        const s = start || new THREE.Vector2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        const angle = s.angleTo(new THREE.Vector2()) + (Math.random() - 0.5) * 2 * Math.PI * 0.8;
        const r = this.lerp(0.7, 0.9, Math.random());
        return { start: s, end: new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r) };
    }
    // GSAP rough() ease: a jittery path through `points` random offsets around the base ease.
    rough(strength, points, template) {
        const base = template ? (t) => 1 - (1 - t) * (1 - t) : (t) => t;
        const xs = [0], ys = [0];
        for (let i = 1; i < points; i++) {
            const x = i / points;
            xs.push(x);
            ys.push(Math.max(0, Math.min(1, base(x) + (Math.random() - 0.5) * strength * 0.1)));
        }
        xs.push(1);
        ys.push(1);
        return (t) => {
            let i = 1;
            while (i < xs.length - 1 && xs[i] < t) i++;
            const k = (t - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
            return ys[i - 1] + (ys[i] - ys[i - 1]) * k;
        };
    }
    schedule(now) {
        this.velocity.set(1, 1);
        const count = Math.floor(Math.random() * 3) + 1;
        let prev = null;
        let t = now;
        const segs = [];
        for (let i = 0; i < count; i++) {
            const chained = i !== count - 1 && Math.random() < 0.7;
            const duration = chained ? this.lerp(0.8, 1, Math.random()) : this.lerp(0.7, 0.8, Math.random());
            const dir = this.directions(prev);
            segs.push({
                start: t, duration, dir,
                easeX: this.rough(chained ? 3 : 2, Math.floor(duration * 12), chained),
                easeY: this.rough(chained ? 3 : 2, Math.floor(duration * 12), chained)
            });
            t += duration;
            prev = dir.end;
        }
        this.plan = { segs, end: t, next: t + this.lerp(1, 3, Math.random()) };
    }
    update(now) {
        if (!this.plan || now >= this.plan.next) this.schedule(now);
        if (now >= this.plan.end) {
            this.target.set(-1, -1);
            return;
        }
        for (const s of this.plan.segs) {
            if (now < s.start || now > s.start + s.duration) continue;
            const p = (now - s.start) / s.duration;
            const { start, end } = s.dir;
            this.target.set(
                this.lerp(start.x / 2 + 0.5, end.x / 2 + 0.5, s.easeX(p)),
                this.lerp(start.y / 2 + 0.5, end.y / 2 + 0.5, s.easeY(p))
            );
        }
    }
}

/* ---------- their site-wide fluid map, reduced to the one channel the relief reads (.b) ---------- */

const fluidFrag = `precision highp float;
uniform sampler2D tMap;uniform vec2 uMouse;uniform vec2 uVelocity;uniform float uAspect;uniform float uDeltaMult;varying vec2 vUv;
void main(){vec4 d=texture2D(tMap,vUv)*pow(.965,uDeltaMult);vec2 c=vUv-uMouse;c.x*=uAspect;
float speed=min(1.,length(uVelocity)*40.);float s=exp(-dot(c,c)/.0035)*speed*uDeltaMult*1.6;
d.rg+=uVelocity*s*60.;d.b+=s*6.;gl_FragColor=d;}`;

/* ---------- scene ---------- */

export function start(root, canvas, { reduceMotion = false, isMobile = false } = {}) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xc8c8c8, 1);

    const uTime = { value: 0 };
    const tMaskNoise = { value: makeNoiseTexture(256, 3, 5) };
    const tAttenuation = { value: makeNoiseTexture(256, 11, 5) };
    const tPlaster = { value: makePlasterTexture(512) };
    const uResolution = { value: new THREE.Vector2() };
    const uAspect = { value: 1 };
    const uOpacity = { value: 1 };
    const uTextureStrength = { value: CONFIG.extrude.textureStrength };
    const uGradientStrength = { value: CONFIG.extrude.gradientStrength };

    const flowmap = new Flowmap(renderer, {
        tNoise: tMaskNoise, uTime,
        falloff: CONFIG.flowmap.falloff, alpha: CONFIG.flowmap.alpha, dissipation: CONFIG.flowmap.dissipation
    });

    // Fluid map ping-pong (stands in for their global tFluidFlowmap).
    const fluidOpts = { type: THREE.HalfFloatType, depthBuffer: false };
    let fluidRead = new THREE.WebGLRenderTarget(128, 128, fluidOpts);
    let fluidWrite = new THREE.WebGLRenderTarget(128, 128, fluidOpts);
    const tFluidFlowmap = { value: fluidRead.texture };
    const fluidMaterial = new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}',
        fragmentShader: fluidFrag,
        uniforms: {
            tMap: tFluidFlowmap, uMouse: { value: new THREE.Vector2(-1, -1) }, uVelocity: { value: new THREE.Vector2() },
            uAspect: { value: 1 }, uDeltaMult: { value: 1 }
        },
        depthTest: false
    });
    const fluidScene = new THREE.Scene();
    const fluidMesh = new THREE.Mesh(fullscreenTriangle(), fluidMaterial);
    fluidMesh.frustumCulled = false;
    fluidScene.add(fluidMesh);

    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, CONFIG.camera.near, CONFIG.camera.far);
    camera.position.z = CONFIG.camera.distance;
    const scene = new THREE.Scene();

    // Background plaster (their wall shader, drawn first).
    const wall = new THREE.Mesh(fullscreenTriangle(), new THREE.RawShaderMaterial({
        vertexShader: wallVert, fragmentShader: wallFrag,
        uniforms: { uGradientStrength, tPlaster, uTextureStrength },
        depthWrite: false, depthTest: false
    }));
    wall.frustumCulled = false;
    wall.renderOrder = -1;
    scene.add(wall);

    const sections = [];
    let sectionsPerLine = 1;
    const disposables = [];

    const draco = new DRACOLoader().setDecoderPath(DRACO_URL);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    let loaded = false;
    loader.load(MODEL_URL, (gltf) => {
        if (stopped) return;
        const perRow = {};
        const rows = [];
        gltf.scene.children.forEach((child) => {
            if (!child.geometry) return;
            const mesh = new THREE.Mesh();
            mesh.geometry = child.geometry;
            mesh.position.copy(child.position);
            mesh.scale.copy(child.scale);
            const row = Math.round(child.position.y);
            perRow[row] = (perRow[row] || 0) + 1;
            if (perRow[row] > sectionsPerLine) sectionsPerLine = perRow[row];
            if (!rows.includes(row)) rows.push(row);
            mesh.material = new THREE.ShaderMaterial({
                vertexShader: reliefVert,
                // three r169 already declares sRGBTransferOETF in the shader prefix; rename theirs (same maths).
                fragmentShader: reliefFrag.replace(/sRGBTransferOETF\(/g, 'igSRGBTransferOETF('),
                defines: RELIEF_DEFINES,
                uniforms: {
                    uResolution, uAspect,
                    uDPR: { value: renderer.getPixelRatio() },
                    uTime,
                    uScroll: { value: 0 }, uScrollSpeed: { value: 0 }, uScreenScroll: { value: 0 },
                    uOpacity,
                    uSwitchColorTransition: { value: 0 },
                    tMaskNoise: tAttenuation,
                    tFlow: flowmap.uniform,
                    uTransition: { value: 0 },
                    tPlaster, uTextureStrength, uGradientStrength,
                    uSwitchColorFastScroll: { value: 0 },
                    tFluidFlowmap,
                    uFastScroll: { value: 0 },
                    uBrightnessFactor: { value: isMobile ? 0.5 : 0.6 },
                    uBrightnessOffset: { value: isMobile ? 0.6 : 0.4 },
                    tBake1: { value: child.material.map },
                    tBake2: { value: child.material.emissiveMap }
                }
            });
            mesh.renderOrder = rows.indexOf(row);
            sections.push(mesh);
            scene.add(mesh);
            disposables.push(mesh.geometry, mesh.material, child.material.map, child.material.emissiveMap);
        });
        loaded = true;
        root.classList.add('has-relief');
    }, undefined, (err) => console.warn('[start-relief] model failed to load', err));

    const pointer = new Pointer();
    const ghost = new GhostPointer(flowmap.mouse2, flowmap.velocity2);

    function updateCamera() {
        const visible = VIEW_SCALE * (SECTION_HEIGHT - 0.1) / uAspect.value;
        const fov = 2 * Math.atan(visible / (2 * CONFIG.camera.distance)) * (180 / Math.PI);
        camera.fov = Math.min(CONFIG.camera.fov, fov);
        camera.zoom = CONFIG.camera.zoom;
        camera.updateProjectionMatrix();
    }
    function resize() {
        const w = root.clientWidth, h = root.clientHeight;
        renderer.setSize(w, h, false);
        const dpr = renderer.getPixelRatio();
        uResolution.value.set(w * dpr, h * dpr);
        uAspect.value = w / h;
        flowmap.aspect = w / h;
        fluidMaterial.uniforms.uAspect.value = w / h;
        camera.aspect = w / h;
        updateCamera();
    }
    window.addEventListener('resize', resize);
    resize();

    let stopped = false;
    let last = performance.now();
    let raf = 0;
    function frame(now) {
        if (stopped) return;
        raf = requestAnimationFrame(frame);
        const delta = Math.max(0, now - last);
        last = now;
        const seconds = delta / 1000;
        uTime.value += seconds;

        pointer.tick(delta);
        flowmap.tick(delta);
        if (!reduceMotion) ghost.update(uTime.value);

        // Section wrap with scroll at 0 (their update()).
        if (loaded) {
            const total = sections.length / sectionsPerLine * SECTION_HEIGHT;
            sections.forEach((s) => {
                const y = s.position.y + scene.position.y;
                if (y < -total * 0.5) s.position.y += total;
                if (y > total * 0.5) s.position.y -= total;
            });
        }

        flowmap.mouse.lerp(pointer.normalFlip, CONFIG.flowmap.mouseEase);
        flowmap.velocity.lerp(pointer.velocity, pointer.velocity.length() ? 0.1 : 0.04);
        flowmap.update(0);

        fluidMaterial.uniforms.uMouse.value.copy(pointer.normalFlip);
        fluidMaterial.uniforms.uVelocity.value.copy(pointer.velocity);
        fluidMaterial.uniforms.uDeltaMult.value = Math.min(delta, 32) / 16;
        renderer.setRenderTarget(fluidWrite);
        renderer.render(fluidScene, flowmap.camera);
        renderer.setRenderTarget(null);
        const t = fluidRead; fluidRead = fluidWrite; fluidWrite = t;
        tFluidFlowmap.value = fluidRead.texture;

        updateCamera();
        renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    return function stop() {
        stopped = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        pointer.dispose();
        flowmap.dispose();
        fluidRead.dispose();
        fluidWrite.dispose();
        fluidMaterial.dispose();
        wall.material.dispose();
        disposables.forEach((d) => d && d.dispose && d.dispose());
        [tMaskNoise, tAttenuation, tPlaster].forEach((t) => t.value.dispose());
        draco.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
    };
}
