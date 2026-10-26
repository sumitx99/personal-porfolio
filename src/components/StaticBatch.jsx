import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { batchStaticMeshes } from '../three/staticBatch'

export default function StaticBatch({ children, cellSize = 12, revision }) {
  const root = useRef()
  const invalidate = useThree((s) => s.invalidate)
  // Callers identify geometry/transform changes with revision. UI-only rerenders
  // must not rebuild buffers; paint changes already share the same materials.
  useLayoutEffect(() => {
    const batches = batchStaticMeshes(root.current, { cellSize })
    invalidate()
    return () => batches.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, cellSize, invalidate])
  return <group ref={root}>{children}</group>
}
