import { useState, useRef } from 'react'
import AvatarViewer from '../components/avatar/AvatarViewer'
import MorphControls from '../components/avatar/MorphControls'
import SEO from '../components/SEO'
import { Box, CheckCircle2, ShieldCheck, Compass } from 'lucide-react'

export default function AvatarPocPage() {
  const viewerRef = useRef(null)

  const [morphWeights, setMorphWeights] = useState({
    chestScale: 0.0,
    waistScale: 0.0,
    hipScale: 0.0,
    legLength: 0.0,
    torsoDepth: 0.0,
  })

  const [detectedMorphs, setDetectedMorphs] = useState([])

  const handleResetView = () => {
    if (viewerRef.current) {
      viewerRef.current.resetView()
    }
  }

  return (
    <>
      <SEO
        title="3D Avatar Foundation POC | TrendVolt"
        description="Phase 2 Technical Proof of Concept for 3D Base Avatar rendering and morph target control."
        noindex={true}
      />

      <div className="min-h-screen bg-[var(--tv-bg)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--tv-border)]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--tv-olive)]/10 text-[var(--tv-olive)] dark:text-emerald-400 mb-3">
                <Box className="w-3.5 h-3.5" />
                <span>Phase 2 — 3D Foundation Proof-of-Concept</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--tv-text-primary)]">
                3D Avatar & Morph Target POC
              </h1>
              <p className="mt-2 text-sm text-[var(--tv-text-secondary)] max-w-2xl">
                Technical verification demonstrating responsive WebGL canvas rendering, 360° orbit
                controls, GLTF/GLB asset loading, and real-time morph target deformation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetView}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-medium bg-[var(--tv-surface)] text-[var(--tv-text-primary)] border border-[var(--tv-border)] hover:bg-[var(--tv-surface-elevated)] transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[var(--tv-olive)]" />
                Reset 3D Camera
              </button>
            </div>
          </div>

          {/* Main 3D Verification Canvas & Control Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: 3D WebGL Viewer (7 columns) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="h-[520px] sm:h-[580px] w-full">
                <AvatarViewer
                  ref={viewerRef}
                  modelUrl="/models/base_avatar_poc.glb"
                  morphWeights={morphWeights}
                  onMorphTargetsDetected={setDetectedMorphs}
                />
              </div>

              {/* Technical POC Status Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--tv-text-primary)]">
                      360° Orbit Controls
                    </div>
                    <div className="text-[11px] text-[var(--tv-text-muted)]">
                      Active damping & bounded pitch
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--tv-text-primary)]">
                      GLB Asset Pipeline
                    </div>
                    <div className="text-[11px] text-[var(--tv-text-muted)]">
                      Binary GLTF 2.0 (462 KB)
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--tv-text-primary)]">
                      Legally Clean Asset
                    </div>
                    <div className="text-[11px] text-[var(--tv-text-muted)]">
                      MIT / TrendVolt Internal
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Morph Target Parameter Controls (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              <MorphControls
                morphWeights={morphWeights}
                onChange={setMorphWeights}
                detectedMorphs={detectedMorphs}
              />

              {/* Architecture Boundary Notice */}
              <div className="p-5 rounded-2xl bg-[var(--tv-bg-warm)] border border-[var(--tv-border)] text-xs text-[var(--tv-text-secondary)] space-y-2">
                <div className="font-semibold text-[var(--tv-text-primary)] uppercase tracking-wider text-[11px]">
                  Phase 2 Verification Boundary
                </div>
                <p>
                  This view is an isolated engineering proof-of-concept. Per Phase 2 architecture
                  rules:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[var(--tv-text-muted)]">
                  <li>No customer database profiles are created or queried.</li>
                  <li>Sliders control test morph weights directly in client memory.</li>
                  <li>No garment assets or cloth physics are loaded.</li>
                  <li>Existing sizing engine and checkout remain untouched and authoritative.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
