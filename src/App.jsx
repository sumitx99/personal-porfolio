import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Certifications from './pages/Certifications'
import Analytics from './pages/Analytics'
import Coding from './pages/Coding'

// Experiments carries the 3D card scenes, so it loads on demand.
const Experiments = lazy(() => import('./pages/Experiments'))
const Garage = lazy(() => import('./pages/Garage'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="experiments"
          element={
            <Suspense fallback={<div className="page" />}>
              <Experiments />
            </Suspense>
          }
        />
        <Route path="certifications" element={<Certifications />} />
        <Route path="coding" element={<Coding />} />
        <Route path="analytics" element={<Analytics />} />
        <Route
          path="garage"
          element={
            <Suspense fallback={<div className="page" />}>
              <Garage />
            </Suspense>
          }
        />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
