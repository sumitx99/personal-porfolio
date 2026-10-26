import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Opt-in, local diagnostics: /garage?perf=1. No network requests or visitor telemetry.
// Keep counters across ALL passes (shadows, contact blur, views), not just the last render.
export default function RenderMetrics({ name }) {
  const enabled = new URLSearchParams(window.location.search).get('perf') === '1'
  return enabled ? <Probe name={name} /> : null
}

function Probe({ name }) {
  const { gl } = useThree()
  const samples = useRef([])
  const previous = useRef(false)
  useEffect(() => {
    const autoReset = gl.info.autoReset
    gl.info.autoReset = false
    gl.domElement.dataset.scene = name
    return () => {
      gl.info.autoReset = autoReset
      delete gl.domElement.dataset.renderMetrics
      delete gl.domElement.dataset.scene
    }
  }, [gl, name])
  useFrame((_, dt) => {
    if (previous.current && dt > 0 && dt < 0.25) {
      samples.current.push({ ms: dt * 1000, calls: gl.info.render.calls, triangles: gl.info.render.triangles })
      if (samples.current.length >= 120) {
        const rows = samples.current
        const times = rows.map((s) => s.ms).sort((a, b) => a - b)
        const average = (key) => rows.reduce((sum, s) => sum + s[key], 0) / rows.length
        gl.domElement.dataset.renderMetrics = JSON.stringify({
          name, sampledAt: Math.round(performance.now()), fps: +(1000 / average('ms')).toFixed(1),
          medianMs: +times[60].toFixed(2), p95Ms: +times[114].toFixed(2),
          calls: Math.round(average('calls')), triangles: Math.round(average('triangles')),
          geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
          programs: gl.info.programs.length, dpr: gl.getPixelRatio(),
          width: gl.domElement.width, height: gl.domElement.height,
        })
        samples.current = []
      }
    } else samples.current = []
    previous.current = true
    gl.info.reset()
  }, -1000)
  return null
}
