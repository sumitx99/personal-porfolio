# Three.js performance and quality

## What changed

- Explicitly static subtrees are merged by material, vertex layout, shadow settings, and spatial cell. This reduces draw submissions without removing triangles or changing textures. Transparent meshes retain independent sorting. Skinned meshes, mirrored transforms, and the animated DRS flap are excluded.
- Quantized GLB positions/normals/tangents are decoded to floats before baking transforms. Otherwise normalized integer arrays would overflow when transformed.
- The desktop model and static pit-lane props use this batching; garage/race car bodies keep wheels and other animated parts separate.
- Garage directional shadows and contact shadows retain their full resolution and are cached while the geometry is stationary. Both update throughout a pit stop, and refresh on team/compound changes. Loading completes before the first contact-shadow capture.
- Disabling auto-rotate in a dry, inactive garage selects demand rendering. Orbit controls, scene changes, and pit animations resume rendering as needed.
- Experiments use one WebGL renderer with scissored Drei Views, rather than one context per card. Nearby scenes mount on demand. The overlay keeps rendering during scrolling to stay aligned with its cards, and pauses when the document is hidden.
- Pit-stop hoses update persistent position/normal buffers with the same TubeGeometry construction. They no longer delete/recreate four tube geometries each frame.
- Scene clocks preserve animation time across Fiber 8 frameloop resets. Hidden/scroll-paused time does not restart the animation.
- Scene components are memoized so unrelated UI polling/typing does not recreate environments or reconfigure canvases.
- Procedural crew/equipment geometry, team textures, cloned paint materials, and glow textures are released on replacement/unmount. Shared loader geometry and cached textures remain shared. Race unmounts no longer dispose wheel geometry owned by the splitter cache.

## Quality settings

Mobile and desktop now use the same anti-aliasing and DPR range `[1, 1.5]`. DPR is capped at 1.5 on both; this is the existing desktop resolution budget, not native resolution on every high-density display. There is no automatic FPS-triggered resolution downgrade.

Mobile also receives the desktop hero particle/node/satellite counts, all four neighboring garages, garage shadows/contact shadows, 512px garage/race environment maps, and the robot's 128px environment map/contact shadow. Layout, model placement, and camera framing remain responsive.

The source GLBs and textures were not modified or simplified. The existing simplified race-only rival models remain in use; the player's original model remains full detail.

## Evidence collected locally

These are workload measurements from the local Mac preview, not Windows/Android/iPhone FPS benchmarks.

| Check | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Garage sample, all render passes | 606 draw calls, 1,132,574 triangles/frame | 187 draw calls, 297,919 triangles/frame | About 69% fewer calls in the captured samples. Cached shadow passes stop repeating; geometry detail is preserved. Camera auto-rotation means this is not an identical-camera benchmark. |
| Desktop model, decoded GLB audit | 685 visible mesh submissions | 86 | Same 86,272 triangles and world-space bounds; audit counts every visible mesh, without camera culling. Live optimized preview also recorded 86 calls. |
| Alpine rig, decoded GLB audit | 217 visible mesh submissions | 118 | Same 442,117 rendered triangles and bounds, with wheel pivots separate. |
| Experiment card contexts | One per nearby card | One for all cards | The robot retains its independent context. |

The Mac preview ran near 60 FPS before and after. Reduced work creates headroom; these numbers do not imply a proportional FPS improvement on other GPUs.

Automated checks cover world-space vertices, normals, UVs, material/shadow settings, transparent/skinned/mirrored exclusions, independent moving parts, quantized geometry, cleanup, and hose equivalence to TubeGeometry with stable buffers. The real-asset audit loads the desktop and all nine original car GLBs and checks triangle counts and bounds before/after batching.

All 47 automated tests and the production build passed. Browser verification included desktop and 390×844 layouts, experiment alignment while scrolling, Ferrari/Alpine team switching, Ferrari paint changes, garage tyre-change completion, idle rendering, racing, cockpit/heli cameras, boost, and race → garage pit stop → race handoff. The built production experiment and garage routes also passed visual smoke checks. No runtime errors were observed in those checks.

## Verify on the affected hardware

1. Run `npm run build` and `npm run preview -- --host 0.0.0.0` on the local network, or test a normal deployed build. Compare production builds, browser zoom, viewport, power mode, and the same device/browser; development/HMR timings are not representative of shipping performance.
2. Open `/?perf=1`, `/coding?perf=1`, `/experiments?perf=1`, and `/garage?perf=1`. After assets finish loading, capture several samples for idle, scrolling, camera motion, wet tyres, the pit crew, and racing.
3. Inspect the canvas `data-render-metrics` JSON. It includes median and p95 frame times, average calls/triangles across all passes, texture/geometry counts, DPR, and drawing-buffer size. `sampledAt` stops advancing when that scene stops drawing. There is no diagnostics overhead for normal visitors beyond the small disabled component check.
4. Repeat team/race changes and check that memory settles after resources are released. Asset loader caches retain previously loaded cars intentionally; growth from visiting a new car is different from unbounded growth on revisiting the same car.
5. Test actual touch scrolling/orbiting on the phone. A narrow Mac browser verifies layout and breakpoint behavior, not mobile GPU speed, battery use, thermals, or touch hardware.

## Tradeoffs and remaining limits

Batching adds a merged geometry copy while source GLB buffers remain cached. It reduces submissions at the cost of some memory and initial processing. Spatial cells preserve coarse culling in the pit lane; transparent and moving objects remain separate. Cached shadows are valid because the lights and stationary casters do not move; new animated casters must invalidate them.

Continuous animation, wet weather, and the moving race still require real rendering work. The restored mobile shadows and reflections have a GPU cost. Actual Windows/phone profiling is still required before declaring the original lag resolved; those devices were not connected during this work. The existing large Three.js entry bundle build warning also remains.

No deployment was performed.
