export const COMPOUNDS = {
  soft: { label: 'Soft', color: '#e8262b', note: 'Fastest, wears quickly' },
  medium: { label: 'Medium', color: '#ffd12a', note: 'The balanced choice' },
  hard: { label: 'Hard', color: '#f2f2f2', note: 'Slow but lasts all race' },
  wet: { label: 'Wet', color: '#1f7cff', note: 'For when it really rains' },
}

// Pit stop timeline, in seconds from the call to box.
export const PIT_TIMELINE = { arrive: 0.85, jackUp: 1.05, wheelsOff: 1.45, wheelsOn: 1.95, jackDown: 2.15, leave: 3.05 }

// 3D models from Sketchfab, CC BY 4.0 (authors credited on the Garage page). Compressed copies live in public/cars.
// The Williams is the Mercedes W17 model repainted in Blender with the FW48 livery (`basedOn`).
export const TEAMS = [
  { id: 'redbull', name: 'Red Bull', car: 'RB22', file: '/cars/redbull.glb', color: '#1e41ff', crew: '#14223f', url: 'https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383' },
  { id: 'ferrari', name: 'Ferrari', car: 'SF-26', file: '/cars/ferrari.glb', color: '#dc0000', crew: '#b00000', url: 'https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7' },
  { id: 'mercedes', name: 'Mercedes', car: 'W17', file: '/cars/mercedes.glb', color: '#00d2be', crew: '#1b1c1f', url: 'https://sketchfab.com/3d-models/2026-mercedes-w17-b806f1e70aa343219e7158169549b97b' },
  { id: 'aston', name: 'Aston Martin', car: 'AMR26', file: '/cars/aston_martin.glb', color: '#00665e', crew: '#0b3b35', url: 'https://sketchfab.com/3d-models/2026-aston-martin-amr26-a50d1c7bc086455c9412470d93fc3fc7' },
  { id: 'mclaren', name: 'McLaren', car: 'MCL40', file: '/cars/mclaren.glb', color: '#ff8000', crew: '#ff8000', url: 'https://sketchfab.com/3d-models/2026-mclaren-mcl40-96214ad5624f42a0861f77008f8d29e7' },
  { id: 'audi', name: 'Audi', car: 'R26', file: '/cars/audi.glb', color: '#bb0a30', crew: '#2b2d31', url: 'https://sketchfab.com/3d-models/2026-audi-r26-32bf228264b047669b100b0f1b8769ac' },
  { id: 'alpine', name: 'Alpine', car: 'A525', file: '/cars/alpine.glb', color: '#ff87bc', crew: '#0a5fa8', author: 'Abu Saif', authorUrl: 'https://sketchfab.com/abuhossain844', url: 'https://sketchfab.com/3d-models/2025-alpine-a525-5f029644bc2d4eaebbec88712ea46dfa' },
  { id: 'williams', name: 'Williams', car: 'FW48', file: '/cars/williams.glb', color: '#1652d6', crew: '#0b1f5c', basedOn: 'Mercedes W17', url: 'https://sketchfab.com/3d-models/2026-mercedes-w17-b806f1e70aa343219e7158169549b97b' },
  { id: 'cadillac', name: 'Cadillac', car: 'MAC-26', file: '/cars/cadillac.glb', color: '#c9a95c', crew: '#111214', url: 'https://sketchfab.com/3d-models/2026-cadillac-mac-26-95bcd37aa7c649779efc33b90b6c023e' },
]

export const PAINTS = ['#dc0000', '#ff8000', '#1e41ff', '#00665e', '#d4ff3a', '#f2f2f2', '#111214', '#ff87bc']
