import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react'
import { isWebGLAvailable } from '../../utils/webglSupport'
import { GarmentLayerManager } from './GarmentLayer'
import { computeHeightScale } from '../../constants/avatarStudioConstants'
import {
  resolveAvatarAsset,
  introspectAvatarScene,
} from '../../utils/avatarAssetResolver'

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 1.1, 3.2)
const DEFAULT_TARGET = new THREE.Vector3(0, 0.9, 0)

const AvatarViewer = forwardRef(function AvatarViewer(
  {
    modelUrl = null,
    demographic = 'men',
    morphWeights = {},
    facialMorphs = {},
    skinColor = null,
    eyeColor = null,
    heightCm = null,
    garment = null,
    garments = null,
    onMorphTargetsDetected,
    onCapabilitiesDetected,
    onGarmentLoaded,
    onGarmentError,
    onGarmentStartLoad,
    className = '',
  },
  ref
) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const morphMeshRef = useRef(null)
  const modelSceneRef = useRef(null)
  const garmentLayerRef = useRef(null)
  const animFrameIdRef = useRef(null)
  const introspectionRef = useRef(null)

  const resolvedAsset = useMemo(() => {
    return resolveAvatarAsset(demographic, {
      customProductionPath: modelUrl && modelUrl !== '/models/base_avatar_poc.glb' ? modelUrl : null,
      allowPocFallback: true,
    })
  }, [demographic, modelUrl])

  const activeModelUrl =
    modelUrl && modelUrl !== '/models/base_avatar_poc.glb'
      ? modelUrl
      : resolvedAsset.url || '/models/base_avatar_poc.glb'

  const [webglSupported] = useState(() => isWebGLAvailable())
  const [loading, setLoading] = useState(webglSupported)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)

  const morphWeightsRef = useRef(morphWeights)
  const facialMorphsRef = useRef(facialMorphs)
  const skinColorRef = useRef(skinColor)
  const eyeColorRef = useRef(eyeColor)
  const heightCmRef = useRef(heightCm)
  const garmentRef = useRef(garment)
  const garmentsRef = useRef(garments)
  const onMorphTargetsDetectedRef = useRef(onMorphTargetsDetected)
  const onCapabilitiesDetectedRef = useRef(onCapabilitiesDetected)
  const onGarmentLoadedRef = useRef(onGarmentLoaded)
  const onGarmentErrorRef = useRef(onGarmentError)
  const onGarmentStartLoadRef = useRef(onGarmentStartLoad)
  const resolvedAssetRef = useRef(resolvedAsset)

  useEffect(() => {
    resolvedAssetRef.current = resolvedAsset
    morphWeightsRef.current = morphWeights
    facialMorphsRef.current = facialMorphs
    skinColorRef.current = skinColor
    eyeColorRef.current = eyeColor
    heightCmRef.current = heightCm
    garmentRef.current = garment
    garmentsRef.current = garments
    onMorphTargetsDetectedRef.current = onMorphTargetsDetected
    onCapabilitiesDetectedRef.current = onCapabilitiesDetected
    onGarmentLoadedRef.current = onGarmentLoaded
    onGarmentErrorRef.current = onGarmentError
    onGarmentStartLoadRef.current = onGarmentStartLoad
  })

  // Expose camera reset to parent
  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (cameraRef.current && controlsRef.current) {
        const s = computeHeightScale(heightCmRef.current)
        cameraRef.current.position.set(0, 1.1 * s, 3.2 * s)
        controlsRef.current.target.set(0, 0.9 * s, 0)
        controlsRef.current.update()
      }
    },
  }))

  // Initial WebGL setup and scene lifecycle
  useEffect(() => {
    if (!webglSupported) {
      return
    }

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let isMounted = true

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = null // transparent to blend with luxury background
    sceneRef.current = scene

    // Initialize modular GarmentLayer
    const garmentLayer = new GarmentLayerManager(scene)
    garmentLayerRef.current = garmentLayer
    if (garmentsRef.current) {
      garmentLayer.setGarments(garmentsRef.current, {
        onLoad: (mesh, slot) => {
          if (onGarmentLoadedRef.current) onGarmentLoadedRef.current(mesh, slot)
        },
        onError: (err, slot) => {
          if (onGarmentErrorRef.current) onGarmentErrorRef.current(err, slot)
        },
        onStartLoad: (slot) => {
          if (onGarmentStartLoadRef.current) onGarmentStartLoadRef.current(slot)
        },
      })
      garmentLayer.updateMorphs(morphWeightsRef.current)
    } else if (garmentRef.current) {
      garmentLayer.setGarment(garmentRef.current, {
        onLoad: (mesh) => {
          if (onGarmentLoadedRef.current) onGarmentLoadedRef.current(mesh)
        },
        onError: (err) => {
          if (onGarmentErrorRef.current) onGarmentErrorRef.current(err)
        },
      })
      garmentLayer.updateMorphs(morphWeightsRef.current)
    }

    // 2. Camera
    const width = container.clientWidth || 400
    const height = container.clientHeight || 500
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50)
    camera.position.copy(DEFAULT_CAMERA_POS)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    rendererRef.current = renderer

    // 4. Orbit Controls (360° horizontal rotation with controlled vertical angles)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.copy(DEFAULT_TARGET)
    controls.minDistance = 1.2
    controls.maxDistance = 4.8
    controls.minPolarAngle = 0.2 // prevent looking directly top-down
    controls.maxPolarAngle = Math.PI / 2 + 0.05 // prevent flipping under floor
    controlsRef.current = controls

    // 5. Studio Lighting Rig - Luxury Editorial Calibration
    const ambientLight = new THREE.AmbientLight(0xfff8f2, 0.75)
    scene.add(ambientLight)

    // Key light: warm frontal-side key illumination
    const keyLight = new THREE.DirectionalLight(0xfff8f2, 1.35)
    keyLight.position.set(2.2, 3.2, 2.8)
    scene.add(keyLight)

    // Fill light: soft neutral cool bounce to illuminate silhouette details
    const fillLight = new THREE.DirectionalLight(0xe8eff8, 0.65)
    fillLight.position.set(-2.2, 1.8, 2.0)
    scene.add(fillLight)

    // Rim light: back-edge separation defining shoulders and posture
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85)
    rimLight.position.set(0, 2.6, -2.4)
    scene.add(rimLight)

    // Overhead top light: subtle crown illumination
    const topLight = new THREE.DirectionalLight(0xfffdfa, 0.40)
    topLight.position.set(0, 3.8, 0)
    scene.add(topLight)

    // Soft multi-layered ground contact shadow
    const groundGroup = new THREE.Group()
    groundGroup.name = 'ContactShadowGroup'

    const innerGeo = new THREE.CircleGeometry(0.24, 32)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x181818,
      transparent: true,
      opacity: 0.16,
    })
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    innerMesh.rotation.x = -Math.PI / 2
    innerMesh.position.y = 0.001
    groundGroup.add(innerMesh)

    const outerGeo = new THREE.RingGeometry(0.22, 0.46, 32)
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    })
    const outerMesh = new THREE.Mesh(outerGeo, outerMat)
    outerMesh.rotation.x = -Math.PI / 2
    outerMesh.position.y = 0.002
    groundGroup.add(outerMesh)

    scene.add(groundGroup)

    if (!activeModelUrl) {
      const timer = setTimeout(() => {
        if (isMounted) {
          setLoading(false)
          setError('Unable to load avatar.')
        }
      }, 0)
      return () => clearTimeout(timer)
    }

    // 6. Model Loader
    setLoading(true)
    setError(null)
    setLoadProgress(0)

    const loader = new GLTFLoader()
    loader.load(
      activeModelUrl,
      (gltf) => {
        if (!isMounted) return

        let detectedMorphs = {}
        let primaryMorphMesh = null

        const currentAsset = resolvedAssetRef.current
        const introspection = introspectAvatarScene(gltf.scene, currentAsset?.assetType)
        introspectionRef.current = introspection

        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            if (child.morphTargetDictionary) {
              primaryMorphMesh = child
              detectedMorphs = { ...child.morphTargetDictionary }
            }
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material]
              mats.forEach((mat) => {
                mat.roughness = 0.68
                mat.metalness = 0.02
              })
            }
          }
        })

        // Apply calibrated skin material to identified skin targets
        if (skinColorRef.current && introspection.skinMaterials.length > 0) {
          introspection.skinMaterials.forEach((mat) => {
            if (mat.color) mat.color.set(skinColorRef.current)
          })
        } else if (skinColorRef.current && primaryMorphMesh?.material) {
          const mats = Array.isArray(primaryMorphMesh.material)
            ? primaryMorphMesh.material
            : [primaryMorphMesh.material]
          mats.forEach((mat) => {
            if (mat.color) mat.color.set(skinColorRef.current)
          })
        }

        // Apply eye color if eye materials detected
        if (eyeColorRef.current && introspection.eyeMaterials.length > 0) {
          introspection.eyeMaterials.forEach((mat) => {
            if (mat.color) mat.color.set(eyeColorRef.current)
          })
        }

        morphMeshRef.current = primaryMorphMesh || introspection.primaryMorphMesh
        modelSceneRef.current = gltf.scene

        // Apply initial proportional height scale
        const initialScale = computeHeightScale(heightCmRef.current)
        gltf.scene.scale.set(initialScale, initialScale, initialScale)
        if (garmentLayerRef.current) {
          garmentLayerRef.current.setHeightScale(initialScale)
        }

        scene.add(gltf.scene)
        setLoading(false)

        if (onMorphTargetsDetectedRef.current) {
          onMorphTargetsDetectedRef.current(Object.keys(detectedMorphs))
        }

        const verifiedCapabilities = introspection.capabilities || currentAsset?.capabilities
        if (onCapabilitiesDetectedRef.current) {
          onCapabilitiesDetectedRef.current(verifiedCapabilities)
        }

        // Apply initial morph weights with safe clamping [0.0, 1.0]
        const activeMesh = morphMeshRef.current
        if (activeMesh && activeMesh.morphTargetDictionary) {
          const dict = activeMesh.morphTargetDictionary
          const infl = activeMesh.morphTargetInfluences
          for (const [key, value] of Object.entries(morphWeightsRef.current || {})) {
            const targetIdx = introspection.bodyMorphMap[key] ?? dict[key]
            if (targetIdx !== undefined && infl[targetIdx] !== undefined) {
              const num = Number(value) || 0
              infl[targetIdx] = Math.min(Math.max(num, 0.0), 1.0)
            }
          }
          for (const [key, value] of Object.entries(facialMorphsRef.current || {})) {
            const targetIdx = introspection.facialMorphMap[key] ?? dict[key]
            if (targetIdx !== undefined && infl[targetIdx] !== undefined) {
              const num = Number(value) || 0
              infl[targetIdx] = Math.min(Math.max(num, 0.0), 1.0)
            }
          }
        }
      },
      (xhr) => {
        if (xhr.total > 0 && isMounted) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100)
          setLoadProgress(percent)
        }
      },
      (err) => {
        if (!isMounted) return
        console.warn('Unable to load avatar asset:', err)
        setError('Unable to load avatar.')
        setLoading(false)
      }
    )

    // 7. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !isMounted) return
      const entry = entries[0]
      const newWidth = entry.contentRect.width
      const newHeight = entry.contentRect.height
      if (newWidth > 0 && newHeight > 0 && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = newWidth / newHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(newWidth, newHeight)
      }
    })
    resizeObserver.observe(container)

    // 8. Animation Render Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 9. Cleanup on Unmount
    return () => {
      isMounted = false
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
      resizeObserver.disconnect()
      controls.dispose()

      if (garmentLayerRef.current) {
        garmentLayerRef.current.dispose()
        garmentLayerRef.current = null
      }

      // Dispose scene objects
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      renderer.dispose()
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      morphMeshRef.current = null
      rendererRef.current = null
    }
  }, [activeModelUrl, webglSupported, retryNonce])

  // React to morphWeights prop updates without rebuilding the scene
  useEffect(() => {
    const mesh = morphMeshRef.current
    const introspection = introspectionRef.current
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary
      const infl = mesh.morphTargetInfluences
      for (const [key, value] of Object.entries(morphWeights || {})) {
        const targetIdx = introspection?.bodyMorphMap[key] ?? dict[key]
        if (targetIdx !== undefined && infl[targetIdx] !== undefined) {
          const num = Number(value) || 0
          infl[targetIdx] = Math.min(Math.max(num, 0.0), 1.0)
        }
      }
    }
    if (garmentLayerRef.current) {
      garmentLayerRef.current.updateMorphs(morphWeights)
    }
  }, [morphWeights])

  // React to facialMorphs prop updates without rebuilding the scene
  useEffect(() => {
    const mesh = morphMeshRef.current
    const introspection = introspectionRef.current
    if (mesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const dict = mesh.morphTargetDictionary
      const infl = mesh.morphTargetInfluences
      for (const [key, value] of Object.entries(facialMorphs || {})) {
        const targetIdx = introspection?.facialMorphMap[key] ?? dict[key]
        if (targetIdx !== undefined && infl[targetIdx] !== undefined) {
          const num = Number(value) || 0
          infl[targetIdx] = Math.min(Math.max(num, 0.0), 1.0)
        }
      }
    }
  }, [facialMorphs])

  // React to eyeColor prop updates
  useEffect(() => {
    eyeColorRef.current = eyeColor
    const introspection = introspectionRef.current
    if (eyeColor && introspection && introspection.eyeMaterials.length > 0) {
      introspection.eyeMaterials.forEach((mat) => {
        if (mat.color) mat.color.set(eyeColor)
      })
    }
  }, [eyeColor])

  // React to heightCm prop updates with proportional scaling and camera target sync
  useEffect(() => {
    heightCmRef.current = heightCm
    const scale = computeHeightScale(heightCm)
    if (modelSceneRef.current) {
      modelSceneRef.current.scale.set(scale, scale, scale)
    }
    if (garmentLayerRef.current) {
      garmentLayerRef.current.setHeightScale(scale)
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.9 * scale, 0)
      controlsRef.current.update()
    }
  }, [heightCm])

  // React to garment / garments prop updates
  useEffect(() => {
    if (!garmentLayerRef.current) return

    if (garments !== null && garments !== undefined) {
      garmentLayerRef.current.setGarments(garments, {
        onLoad: (mesh, slot) => {
          if (onGarmentLoadedRef.current) onGarmentLoadedRef.current(mesh, slot)
        },
        onError: (err, slot) => {
          if (onGarmentErrorRef.current) onGarmentErrorRef.current(err, slot)
        },
        onStartLoad: (slot) => {
          if (onGarmentStartLoadRef.current) onGarmentStartLoadRef.current(slot)
        },
      })
      garmentLayerRef.current.updateMorphs(morphWeights)
    } else if (garment !== null && garment !== undefined) {
      garmentLayerRef.current.setGarment(garment, {
        onLoad: (mesh) => {
          if (onGarmentLoadedRef.current) onGarmentLoadedRef.current(mesh)
        },
        onError: (err) => {
          if (onGarmentErrorRef.current) onGarmentErrorRef.current(err)
        },
      })
      garmentLayerRef.current.updateMorphs(morphWeights)
    } else {
      garmentLayerRef.current.clear()
    }
  }, [garments, garment, morphWeights])

  // Derive active garments list for viewport badge display
  const activeGarmentsList = useMemo(() => {
    if (garments && typeof garments === 'object') {
      const list = []
      if (garments.top) list.push({ ...garments.top, slot: 'top' })
      if (garments.bottom) list.push({ ...garments.bottom, slot: 'bottom' })
      return list
    }
    if (garment && garment.type) {
      return [{ ...garment, slot: garment.type }]
    }
    return []
  }, [garments, garment])

  // React to skinColor prop updates with premium semi-matte skin calibration
  useEffect(() => {
    skinColorRef.current = skinColor
    const introspection = introspectionRef.current
    const mesh = morphMeshRef.current
    if (skinColor) {
      const applySkinMaterial = (mat) => {
        if (mat.color) mat.color.set(skinColor)
        mat.roughness = 0.68
        mat.metalness = 0.02
      }
      if (introspection && introspection.skinMaterials.length > 0) {
        introspection.skinMaterials.forEach(applySkinMaterial)
      } else if (mesh && mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(applySkinMaterial)
        } else {
          applySkinMaterial(mesh.material)
        }
      }
    }
  }, [skinColor])

  // Graceful WebGL unsupported fallback
  if (!webglSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] ${className}`}
      >
        <div className="p-4 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-serif text-[var(--tv-text-primary)] mb-2">
          3D Acceleration Not Available
        </h3>
        <p className="text-sm text-[var(--tv-text-secondary)] max-w-sm">
          WebGL is either disabled or not supported by your browser or graphics device. Standard
          store browsing remains fully available.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF7F0] to-[#EAE3D6] dark:from-[#1E201B] dark:to-[#141512] border border-[var(--tv-border)] select-none ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--tv-surface)]/80 backdrop-blur-xs transition-opacity duration-300">
          <Loader2 className="w-8 h-8 text-[var(--tv-olive)] animate-spin mb-3" />
          <p className="text-xs uppercase tracking-widest text-[var(--tv-text-secondary)] font-medium">
            Loading 3D Base Avatar {loadProgress > 0 ? `(${loadProgress}%)` : '...'}
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[var(--tv-surface)]/95 text-center">
          <AlertCircle className="w-8 h-8 text-[var(--tv-error)] mb-3" />
          <p className="text-sm text-[var(--tv-error)] mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setRetryNonce((n) => n + 1)
            }}
            className="px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-lg bg-[var(--tv-olive)] text-white hover:bg-[var(--tv-olive-hover)] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Floating Viewport Overlay: Guidance & Quick Reset */}
      {!loading && !error && (
        <>
          {activeGarmentsList.length > 0 && (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
              {activeGarmentsList.map((g) => (
                <div key={g.slot} className="flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--tv-surface)]/90 backdrop-blur-xs text-[10px] font-mono uppercase tracking-wider font-bold text-[#34452F] border border-[var(--tv-border)] shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34452F]" />
                    Garment Layer: {g.slot}
                  </span>
                  <span className="text-[9px] text-[var(--tv-text-muted)] font-mono pl-1">
                    {g.isRealAsset ? '[Production 3D Mesh]' : '[Dev Prototype Silhouette]'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              title="Reset Camera View"
              aria-label="Reset Camera View"
              onClick={() => {
                if (cameraRef.current && controlsRef.current) {
                  cameraRef.current.position.copy(DEFAULT_CAMERA_POS)
                  controlsRef.current.target.copy(DEFAULT_TARGET)
                  controlsRef.current.update()
                }
              }}
              className="p-2 rounded-lg bg-[var(--tv-surface)]/90 hover:bg-[var(--tv-surface)] text-[var(--tv-text-primary)] border border-[var(--tv-border)] shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Interaction Hint */}
      {!loading && !error && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--tv-surface)]/80 backdrop-blur-xs text-[var(--tv-text-muted)] border border-[var(--tv-border)]">
            Drag to Rotate • Scroll to Zoom
          </span>
        </div>
      )}
    </div>
  )
})

export default AvatarViewer
