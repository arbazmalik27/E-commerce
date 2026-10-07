/**
 * TrendVolt Phase 3D & 3E — Modular Garment Layer Architecture & Asset Loader
 * 
 * Provides an extensible Three.js layer hierarchy:
 *   AvatarViewer
 *     ├── Base Avatar (Mesh / Mannequin)
 *     └── GarmentLayer
 *           ├── Top (Production GLB Mesh or Top placeholder)
 *           └── Bottom (Production GLB Mesh or Bottom placeholder)
 * 
 * IMPORTANT ARCHITECTURAL RULE:
 * This file provides the modular foundation for product-driven garment attachment.
 * Visual meshes generated here are strictly isolated development placeholders
 * to validate layer positioning, sizing hierarchy, and 360° rotation.
 * They do NOT claim physical cloth simulation or exact fit.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const SUPPORTED_GARMENT_TYPES = ['top', 'bottom']

export class GarmentLayerManager {
  constructor(scene) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.name = 'TV_GarmentLayerGroup'
    this.currentGarment = null
    this.currentMesh = null
    this.currentMorphWeights = {}
    this.currentHeightScale = 1.0
    this.activeRequestId = 0

    // Modular slot architecture: supports simultaneous top + bottom coexistence
    this.slots = {
      top: { garment: null, mesh: null, requestId: 0 },
      bottom: { garment: null, mesh: null, requestId: 0 },
    }

    if (this.scene) {
      this.scene.add(this.group)
    }
  }

  /**
   * Proportionally scales the garment layer group to synchronize with avatar height.
   * @param {number} [scale=1.0]
   */
  setHeightScale(scale = 1.0) {
    const s = Number(scale) || 1.0
    this.currentHeightScale = s
    if (this.group) {
      this.group.scale.set(s, s, s)
    }
  }

  /**
   * Sets or updates multiple modular garment layers simultaneously (e.g. { top, bottom }).
   * Supported layers coexist in the Three.js scene without replacing each other.
   * @param {{ top?: Object|null, bottom?: Object|null }} [garmentsMap]
   * @param {{ onLoad?: Function, onError?: Function, onStartLoad?: Function }} [callbacks]
   */
  setGarments(garmentsMap = {}, callbacks = {}) {
    SUPPORTED_GARMENT_TYPES.forEach((slotType) => {
      const garment = garmentsMap ? garmentsMap[slotType] : null
      this.setSlotGarment(slotType, garment, callbacks)
    })
  }

  /**
   * Sets or updates a single modular garment slot (e.g. 'top' or 'bottom').
   * Allows top and bottom to coexist simultaneously on the avatar.
   * Changing 'top' only replaces 'top'; changing 'bottom' only replaces 'bottom'.
   * @param {'top'|'bottom'} slotType
   * @param {Object|null} garment
   * @param {{ onLoad?: Function, onError?: Function, onStartLoad?: Function }} [callbacks]
   */
  setSlotGarment(slotType, garment, callbacks = {}) {
    if (!SUPPORTED_GARMENT_TYPES.includes(slotType)) {
      console.warn(`[GarmentLayer] Unsupported garment slot: ${slotType}`)
      if (callbacks.onError) {
        callbacks.onError(new Error(`Unsupported garment slot: ${slotType}`), slotType)
      }
      return
    }

    if (!this.slots[slotType]) {
      this.slots[slotType] = { garment: null, mesh: null, requestId: 0 }
    }

    const requestId = ++this.slots[slotType].requestId

    if (!garment || !garment.type) {
      this.clearSlot(slotType)
      return
    }

    const type = String(garment.type).toLowerCase().trim()
    if (type !== slotType) {
      console.warn(`[GarmentLayer] Garment type "${type}" does not match target slot "${slotType}"`)
      if (callbacks.onError) {
        callbacks.onError(new Error(`Type mismatch for slot ${slotType}`), slotType)
      }
      return
    }

    // Performance optimization: prevent unnecessary reload if same product asset is already active
    const prevGarment = this.slots[slotType].garment
    const isSameAsset = Boolean(
      garment.assetUrl &&
      prevGarment?.assetUrl &&
      prevGarment.assetUrl === garment.assetUrl &&
      prevGarment.color === garment.color
    )
    const isSamePlaceholder = Boolean(
      !garment.assetUrl &&
      !prevGarment?.assetUrl &&
      garment.allowPlaceholder &&
      prevGarment?.allowPlaceholder &&
      prevGarment?.label === garment.label &&
      prevGarment?.color === garment.color
    )
    if (this.slots[slotType].mesh && (isSameAsset || isSamePlaceholder)) {
      this.updateMorphs(this.currentMorphWeights)
      if (callbacks.onLoad) {
        callbacks.onLoad(this.slots[slotType].mesh, slotType)
      }
      return
    }

    // Clean up previous mesh for this specific slot only
    this._clearSlotMesh(slotType)
    this.slots[slotType].garment = garment

    // 1. Asynchronous Production 3D GLB/GLTF Asset Loading
    if (garment.assetUrl && typeof garment.assetUrl === 'string' && garment.assetUrl.trim().length > 0) {
      if (callbacks.onStartLoad) {
        callbacks.onStartLoad(slotType)
      }

      const loader = new GLTFLoader()
      loader.load(
        garment.assetUrl,
        (gltf) => {
          // Stale request guard: ensure async response matches newest slot selection
          if (this.slots[slotType].requestId !== requestId || !this.group) {
            this._disposeHierarchy(gltf.scene)
            return
          }

          this._clearSlotMesh(slotType)
          const meshGroup = gltf.scene
          meshGroup.name = `GarmentLayer_${slotType.charAt(0).toUpperCase() + slotType.slice(1)}`
          meshGroup.userData = {
            isRealGarmentAsset: true,
            isDevPlaceholder: false,
            layer: slotType,
            garmentLabel: garment.label || slotType,
            assetUrl: garment.assetUrl,
          }

          if (garment.meshOptions?.offsetY) {
            meshGroup.position.y += Number(garment.meshOptions.offsetY) || 0
          }

          this.slots[slotType].mesh = meshGroup
          this.group.add(meshGroup)
          this.updateMorphs(this.currentMorphWeights)

          if (callbacks.onLoad) {
            callbacks.onLoad(meshGroup, slotType)
          }
        },
        undefined,
        (err) => {
          if (this.slots[slotType].requestId !== requestId) return
          console.error(`[GarmentLayer] Failed to load 3D garment asset for ${slotType}:`, err?.message || 'Load error')

          if (garment.allowPlaceholder === true) {
            this._attachSlotPlaceholder(slotType, garment)
          }

          if (callbacks.onError) {
            callbacks.onError(err, slotType)
          }
        }
      )
      return
    }

    // 2. Attach dev silhouette placeholder ONLY if explicitly allowed (never in customer mode)
    if (garment.allowPlaceholder === true) {
      this._attachSlotPlaceholder(slotType, garment)
      if (callbacks.onLoad && this.slots[slotType].mesh) {
        callbacks.onLoad(this.slots[slotType].mesh, slotType)
      }
    } else {
      if (callbacks.onError) {
        callbacks.onError(new Error('Production garment asset reference missing'), slotType)
      }
    }
  }

  /**
   * Clears a specific modular garment slot without affecting other active layers.
   * @param {'top'|'bottom'} slotType
   */
  clearSlot(slotType) {
    if (!this.slots || !this.slots[slotType]) return
    this.slots[slotType].requestId++
    this._clearSlotMesh(slotType)
    this.slots[slotType].garment = null

    if (this.currentGarment?.type === slotType) {
      this.currentGarment = null
      this.currentMesh = null
    }
  }

  /**
   * Disposes and detaches the mesh for a specific slot.
   */
  _clearSlotMesh(slotType) {
    const slot = this.slots?.[slotType]
    if (slot && slot.mesh) {
      if (this.group) {
        this.group.remove(slot.mesh)
      }
      this._disposeHierarchy(slot.mesh)
      slot.mesh = null
    }
  }

  /**
   * Attaches development placeholder to specific slot.
   */
  _attachSlotPlaceholder(slotType, garment) {
    let placeholder = null
    if (slotType === 'top') {
      placeholder = this._createTopPlaceholder(garment)
    } else if (slotType === 'bottom') {
      placeholder = this._createBottomPlaceholder(garment)
    }

    if (placeholder) {
      this.slots[slotType].mesh = placeholder
      this.group.add(placeholder)
      this.updateMorphs(this.currentMorphWeights)
    }
  }

  /**
   * Sets or updates a single active garment layer (legacy backward-compatible method).
   * Clears all other layers first to maintain single-garment behavior.
   * @param {{ type: 'top' | 'bottom', color?: string|number, label?: string, assetUrl?: string, allowPlaceholder?: boolean, meshOptions?: Object } | null} garment
   * @param {{ onLoad?: Function, onError?: Function }} [callbacks]
   */
  setGarment(garment, callbacks = {}) {
    const requestId = ++this.activeRequestId
    this.clear()

    if (!garment || !garment.type) {
      this.currentGarment = null
      return
    }

    const type = String(garment.type).toLowerCase().trim()
    if (!SUPPORTED_GARMENT_TYPES.includes(type)) {
      console.warn(`[GarmentLayer] Unsupported garment type: ${type}`)
      this.currentGarment = null
      if (callbacks.onError) {
        callbacks.onError(new Error(`Unsupported garment type: ${type}`))
      }
      return
    }

    this.currentGarment = garment

    // 1. If an actual 3D garment asset URL (.glb / .gltf) is provided, load the asset asynchronously
    if (garment.assetUrl && typeof garment.assetUrl === 'string' && garment.assetUrl.trim().length > 0) {
      const loader = new GLTFLoader()
      loader.load(
        garment.assetUrl,
        (gltf) => {
          if (this.activeRequestId !== requestId || !this.group) {
            this._disposeHierarchy(gltf.scene)
            return
          }

          this.clear()
          const meshGroup = gltf.scene
          meshGroup.name = `GarmentLayer_${type.charAt(0).toUpperCase() + type.slice(1)}`
          meshGroup.userData = {
            isRealGarmentAsset: true,
            isDevPlaceholder: false,
            layer: type,
            garmentLabel: garment.label || type,
            assetUrl: garment.assetUrl,
          }

          if (garment.meshOptions?.offsetY) {
            meshGroup.position.y += Number(garment.meshOptions.offsetY) || 0
          }

          this.currentMesh = meshGroup
          this.slots[type].mesh = meshGroup
          this.slots[type].garment = garment
          this.group.add(meshGroup)
          this.updateMorphs(this.currentMorphWeights)

          if (callbacks.onLoad) {
            callbacks.onLoad(meshGroup)
          }
        },
        undefined,
        (err) => {
          if (this.activeRequestId !== requestId) return
          console.error(`[GarmentLayer] Failed to load 3D garment asset:`, err?.message || 'Load error')

          if (garment.allowPlaceholder === true) {
            this._attachPlaceholder(type, garment)
          }

          if (callbacks.onError) {
            callbacks.onError(err)
          }
        }
      )
      return
    }

    // 2. If no 3D asset URL is provided, attach the isolated dev silhouette placeholder ONLY if explicitly allowed
    if (garment.allowPlaceholder === true) {
      this._attachPlaceholder(type, garment)
      if (callbacks.onLoad && this.currentMesh) {
        callbacks.onLoad(this.currentMesh)
      }
    } else {
      if (callbacks.onError) {
        callbacks.onError(new Error('Production garment asset reference missing'))
      }
    }
  }

  _attachPlaceholder(type, garment) {
    if (type === 'top') {
      this.currentMesh = this._createTopPlaceholder(garment)
    } else if (type === 'bottom') {
      this.currentMesh = this._createBottomPlaceholder(garment)
    }

    if (this.currentMesh) {
      this.slots[type].mesh = this.currentMesh
      this.slots[type].garment = garment
      this.group.add(this.currentMesh)
      this.updateMorphs(this.currentMorphWeights)
    }
  }

  /**
   * Development placeholder for 'top' garment layer.
   * Stylized modular torso silhouette confirming upper body layer attachment.
   */
  _createTopPlaceholder(garment) {
    const topGroup = new THREE.Group()
    topGroup.name = 'GarmentLayer_Top'
    topGroup.userData = {
      isDevPlaceholder: true,
      layer: 'top',
      garmentLabel: garment.label || 'Top',
    }

    // Material: Matte editorial weave tone
    const colorHex = garment.color || 0x2e3b2b // deep olive/forest weave tone
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.75,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1, // Render slightly over base mesh to avoid z-fighting
      polygonOffsetUnits: -1,
    })

    // Torso silhouette geometry
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.46, 24)
    const torsoMesh = new THREE.Mesh(torsoGeo, mat)
    torsoMesh.position.set(0, 1.14, 0)
    topGroup.add(torsoMesh)

    // Left shoulder / upper arm cap
    const armGeoL = new THREE.CylinderGeometry(0.085, 0.08, 0.22, 16)
    const armMeshL = new THREE.Mesh(armGeoL, mat)
    armMeshL.position.set(0.25, 1.25, 0)
    armMeshL.rotation.z = -0.25
    topGroup.add(armMeshL)

    // Right shoulder / upper arm cap
    const armGeoR = new THREE.CylinderGeometry(0.085, 0.08, 0.22, 16)
    const armMeshR = new THREE.Mesh(armGeoR, mat)
    armMeshR.position.set(-0.25, 1.25, 0)
    armMeshR.rotation.z = 0.25
    topGroup.add(armMeshR)

    return topGroup
  }

  /**
   * Development placeholder for 'bottom' garment layer.
   * Stylized modular waist/thigh silhouette confirming lower body layer attachment.
   */
  _createBottomPlaceholder(garment) {
    const bottomGroup = new THREE.Group()
    bottomGroup.name = 'GarmentLayer_Bottom'
    bottomGroup.userData = {
      isDevPlaceholder: true,
      layer: 'bottom',
      garmentLabel: garment.label || 'Bottom',
    }

    // Material: Matte editorial charcoal/terracotta tone
    const colorHex = garment.color || 0x242622 // deep charcoal weave tone
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.8,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })

    // Waist / Pelvis silhouette geometry
    const waistGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.26, 24)
    const waistMesh = new THREE.Mesh(waistGeo, mat)
    waistMesh.position.set(0, 0.82, 0)
    bottomGroup.add(waistMesh)

    // Left thigh silhouette
    const legGeoL = new THREE.CylinderGeometry(0.12, 0.11, 0.38, 16)
    const legMeshL = new THREE.Mesh(legGeoL, mat)
    legMeshL.position.set(0.11, 0.54, 0)
    bottomGroup.add(legMeshL)

    // Right thigh silhouette
    const legGeoR = new THREE.CylinderGeometry(0.12, 0.11, 0.38, 16)
    const legMeshR = new THREE.Mesh(legGeoR, mat)
    legMeshR.position.set(-0.11, 0.54, 0)
    bottomGroup.add(legMeshR)

    return bottomGroup
  }

  /**
   * Adjusts garment layer scale based on avatar morph weights.
   * Supports both real meshes with morph targets and silhouette scale factors.
   * @param {Object} morphWeights
   */
  updateMorphs(morphWeights = {}) {
    this.currentMorphWeights = morphWeights

    const chestScale = Number(morphWeights.chestScale) || 0.0
    const waistScale = Number(morphWeights.waistScale) || 0.0
    const hipScale = Number(morphWeights.hipScale) || 0.0

    const applyMeshMorphs = (mesh, layerType) => {
      if (!mesh) return
      let hasMorphTargets = false
      mesh.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          hasMorphTargets = true
          for (const [key, value] of Object.entries(morphWeights)) {
            if (child.morphTargetDictionary[key] !== undefined) {
              child.morphTargetInfluences[child.morphTargetDictionary[key]] = Number(value) || 0
            }
          }
        }
      })

      if (!hasMorphTargets) {
        if (layerType === 'top') {
          const sx = 1.0 + chestScale * 0.18
          const sz = 1.0 + chestScale * 0.18
          mesh.scale.set(sx, 1.0, sz)
        } else if (layerType === 'bottom') {
          const sx = 1.0 + Math.max(waistScale, hipScale) * 0.18
          const sz = 1.0 + Math.max(waistScale, hipScale) * 0.18
          mesh.scale.set(sx, 1.0, sz)
        }
      }
    }

    if (this.slots) {
      if (this.slots.top?.mesh) {
        applyMeshMorphs(this.slots.top.mesh, 'top')
      }
      if (this.slots.bottom?.mesh) {
        applyMeshMorphs(this.slots.bottom.mesh, 'bottom')
      }
    }

    if (
      this.currentMesh &&
      this.currentMesh !== this.slots?.top?.mesh &&
      this.currentMesh !== this.slots?.bottom?.mesh
    ) {
      applyMeshMorphs(this.currentMesh, this.currentGarment?.type)
    }
  }

  /**
   * Deeply disposes geometries, materials, and textures for a hierarchy.
   */
  _disposeHierarchy(root) {
    if (!root) return
    root.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose()
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((mat) => {
          for (const key of Object.keys(mat)) {
            const val = mat[key]
            if (val && typeof val === 'object' && val.isTexture) {
              val.dispose()
            }
          }
          mat.dispose()
        })
      }
    })
  }

  /**
   * Clears active garment mesh and disposes geometries, materials, and textures.
   */
  clear() {
    if (this.slots) {
      this._clearSlotMesh('top')
      this._clearSlotMesh('bottom')
      this.slots.top.garment = null
      this.slots.bottom.garment = null
      this.slots.top.requestId++
      this.slots.bottom.requestId++
    }
    if (this.group) {
      while (this.group.children.length > 0) {
        const child = this.group.children[0]
        this.group.remove(child)
        this._disposeHierarchy(child)
      }
    }
    this.currentGarment = null
    this.currentMesh = null
  }

  /**
   * Cleans up all resources and detaches from scene.
   */
  dispose() {
    this.activeRequestId++
    if (this.slots) {
      this.slots.top.requestId++
      this.slots.bottom.requestId++
    }
    this.clear()
    if (this.scene && this.group) {
      this.scene.remove(this.group)
    }
    this.scene = null
    this.group = null
    this.currentGarment = null
    this.currentMesh = null
    this.slots = null
    this.currentMorphWeights = {}
  }
}
