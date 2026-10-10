/**
 * TrendVolt Phase 12 — Production Human Avatar Asset Contract & Runtime Resolver
 *
 * Authoritative production avatar asset contract, runtime validation, demographic
 * asset resolution, morph target mapping, and strict POC separation.
 *
 * Production Adult Avatar Contract:
 * ---------------------------------
 * 1. Demographic Models: One adult male (AVATAR_ASSETS.production.men) and
 *    one adult female (AVATAR_ASSETS.production.women). Both slots remain null
 *    pending commissioned GLB delivery.
 * 2. Three.js GLTFLoader compatibility: Binary GLTF 2.0 (.glb) format.
 * 3. Spatial & Transform Convention:
 *    - Coordinate System: Right-handed Y-up, +Z forward facing.
 *    - Scale: 1 Three.js unit = 1 meter (Male base height ~1.78m, Female ~1.68m).
 *    - Ground Placement: Model origin (0, 0, 0) situated squarely at floor plane (feet at y = 0).
 * 4. Required Hierarchy & Mesh Names:
 *    - Primary Deformable Mesh: "Avatar_Body" or "Body_Mesh" containing morphTargetDictionary.
 *    - Hairstyle Socket: "Head_Socket" empty Object3D/Group anchored at skull crown.
 * 5. Required Materials:
 *    - Skin Material: "Mat_Skin_Body", "M_Avatar_Skin", or material containing "skin"/"body"/"avatar"/"head".
 *    - Eye Materials: "Mat_Eye_Left", "Mat_Eye_Right", "M_Eye_Iris", or containing "eye"/"iris"/"cornea".
 * 6. Canonical 5 Body Shape Keys:
 *    - chestScale, waistScale, hipScale, legLength, torsoDepth (with case-insensitive / snake_case aliases).
 * 7. Canonical 8 Facial Blendshapes:
 *    - faceWidth, jawWidth, chinLength, noseWidth, eyeSpacing, cheekFullness, lipFullness, eyeSize.
 * 8. Invariants:
 *    - base_avatar_poc.glb is strictly classified as 'poc-avatar', NEVER 'production-avatar'.
 *    - Male selection resolves male production asset; female resolves female production asset.
 *    - Missing assets fail gracefully to technical POC or explicit unavailable state.
 */

export const AVATAR_ASSET_TYPE = {
  PRODUCTION: 'production-avatar',
  POC: 'poc-avatar',
  INVALID: 'invalid',
}

export const AVATAR_ASSET_STATUS = {
  ACTIVE: 'active',
  FALLBACK: 'poc_fallback',
  UNAVAILABLE: 'unavailable',
}

/**
 * Single Authoritative Configuration Point for 3D Avatar Assets
 */
export const AVATAR_ASSETS = {
  production: {
    men: null, // Commissioned canonical asset path, e.g. '/models/BaseAvatar_Adult_Male.glb'
    women: null, // Commissioned canonical asset path, e.g. '/models/BaseAvatar_Adult_Female.glb'
  },
  poc: {
    default: '/models/base_avatar_poc.glb',
  },
}

/**
 * Canonical 5-Target Body Morph Mapping
 * Maps application state keys to candidate morph names in production assets.
 */
export const CANONICAL_BODY_MORPH_MAP = {
  chestScale: ['chestScale', 'Chest_Scale', 'ChestScale', 'chest_scale', 'Chest', 'chest'],
  waistScale: ['waistScale', 'Waist_Scale', 'WaistScale', 'waist_scale', 'Waist', 'waist'],
  hipScale: ['hipScale', 'Hip_Scale', 'HipScale', 'hip_scale', 'Hips', 'Hip', 'hips'],
  legLength: ['legLength', 'Leg_Length', 'LegLength', 'leg_length', 'Legs', 'legs'],
  torsoDepth: ['torsoDepth', 'Torso_Depth', 'TorsoDepth', 'torso_depth', 'Torso', 'torso'],
}

/**
 * Canonical 8-Blendshape Facial Morph Mapping
 * Maps application state keys to candidate facial blendshapes in production assets.
 */
export const CANONICAL_FACIAL_MORPH_MAP = {
  faceWidth: ['faceWidth', 'Face_Width', 'FaceWidth', 'face_width'],
  jawWidth: ['jawWidth', 'Jaw_Width', 'JawWidth', 'jaw_width'],
  chinLength: ['chinLength', 'Chin_Length', 'ChinLength', 'chin_length'],
  noseWidth: ['noseWidth', 'Nose_Width', 'NoseWidth', 'nose_width'],
  eyeSpacing: ['eyeSpacing', 'Eye_Spacing', 'EyeSpacing', 'eye_spacing'],
  cheekFullness: ['cheekFullness', 'Cheek_Fullness', 'CheekFullness', 'cheek_fullness'],
  lipFullness: ['lipFullness', 'Lip_Fullness', 'LipFullness', 'lip_fullness'],
  eyeSize: ['eyeSize', 'Eye_Size', 'EyeSize', 'eye_size'],
}

/**
 * Validates a candidate avatar asset URL and metadata.
 *
 * @param {string|Object} assetInput - Asset URL string or descriptor object
 * @param {Object} [options]
 * @param {boolean} [options.isProductionCandidate=false]
 * @returns {Object} Structured validation result
 */
export function validateAvatarAsset(assetInput, { isProductionCandidate = false } = {}) {
  const result = {
    valid: false,
    assetType: AVATAR_ASSET_TYPE.INVALID,
    url: null,
    capabilities: {
      bodyMorphs: {
        chestScale: false,
        waistScale: false,
        hipScale: false,
        legLength: false,
        torsoDepth: false,
      },
      facialMorphs: {
        faceWidth: false,
        jawWidth: false,
        chinLength: false,
        noseWidth: false,
        eyeSpacing: false,
        cheekFullness: false,
        lipFullness: false,
        eyeSize: false,
      },
      hair: false,
      facialHair: false,
      skinMaterial: false,
      eyeMaterial: false,
    },
    warnings: [],
    errors: [],
  }

  const url = typeof assetInput === 'string' ? assetInput : assetInput?.url

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    result.errors.push('Avatar asset URL is empty or invalid')
    return result
  }

  const cleanUrl = url.trim()
  result.url = cleanUrl

  // Check file extension / scheme
  const isGlbOrGltf =
    cleanUrl.endsWith('.glb') ||
    cleanUrl.endsWith('.gltf') ||
    cleanUrl.includes('.glb?') ||
    cleanUrl.includes('.gltf?')

  if (!isGlbOrGltf) {
    result.errors.push('Avatar asset format must be GLB or GLTF binary')
    return result
  }

  // Check if asset is known technical POC mannequin
  const isPocPath =
    cleanUrl.includes('base_avatar_poc.glb') ||
    cleanUrl.includes('base_avatar_poc') ||
    (!isProductionCandidate && !cleanUrl.includes('BaseAvatar_Adult'))

  if (isPocPath) {
    result.assetType = AVATAR_ASSET_TYPE.POC
    // POC asset natively provides the 5 body morphs and skin material slot
    result.capabilities.bodyMorphs = {
      chestScale: true,
      waistScale: true,
      hipScale: true,
      legLength: true,
      torsoDepth: true,
    }
    result.capabilities.skinMaterial = true

    if (isProductionCandidate) {
      result.valid = false
      result.errors.push(
        'base_avatar_poc.glb is strictly a technical POC mannequin and cannot be classified as a production human avatar'
      )
      return result
    }

    result.valid = true
    result.warnings.push('Active asset is Technical POC Mannequin; facial blendshapes and modular hair are gated')
    return result
  }

  // Asset is candidate production asset
  result.valid = true
  result.assetType = AVATAR_ASSET_TYPE.PRODUCTION
  // By contract, production avatar assets provide full body morphs and material targets
  result.capabilities.bodyMorphs = {
    chestScale: true,
    waistScale: true,
    hipScale: true,
    legLength: true,
    torsoDepth: true,
  }
  result.capabilities.facialMorphs = {
    faceWidth: true,
    jawWidth: true,
    chinLength: true,
    noseWidth: true,
    eyeSpacing: true,
    cheekFullness: true,
    lipFullness: true,
    eyeSize: true,
  }
  result.capabilities.hair = true
  result.capabilities.facialHair = true
  result.capabilities.skinMaterial = true
  result.capabilities.eyeMaterial = true

  return result
}

/**
 * Resolves the appropriate avatar asset descriptor for a given demographic.
 *
 * @param {string} demographic - 'men' | 'women' | 'boys' | 'girls' | 'kids' (case-insensitive)
 * @param {Object} [options]
 * @param {boolean} [options.allowPocFallback=true] - Permit fallback to technical POC asset
 * @param {string|null} [options.customProductionPath=null] - Optional override path
 * @returns {Object} Resolved asset descriptor
 */
export function resolveAvatarAsset(
  demographic = 'men',
  { allowPocFallback = true, customProductionPath = null } = {}
) {
  const normDemographic = (demographic || 'men').toLowerCase().trim()
  const isYouth = ['boys', 'girls', 'kids'].includes(normDemographic)

  // 1. Check custom production override or registered adult production asset
  const productionPath =
    customProductionPath ||
    (!isYouth && AVATAR_ASSETS.production[normDemographic])

  if (productionPath) {
    const validation = validateAvatarAsset(productionPath, { isProductionCandidate: true })
    if (validation.valid && validation.assetType === AVATAR_ASSET_TYPE.PRODUCTION) {
      return {
        url: validation.url,
        assetType: AVATAR_ASSET_TYPE.PRODUCTION,
        status: AVATAR_ASSET_STATUS.ACTIVE,
        isProduction: true,
        isFallback: false,
        demographic: normDemographic,
        capabilities: validation.capabilities,
        warnings: validation.warnings,
      }
    }
  }

  // 2. POC Fallback hierarchy
  if (allowPocFallback) {
    const pocUrl = AVATAR_ASSETS.poc.default
    const pocValidation = validateAvatarAsset(pocUrl, { isProductionCandidate: false })

    return {
      url: pocUrl,
      assetType: AVATAR_ASSET_TYPE.POC,
      status: AVATAR_ASSET_STATUS.FALLBACK,
      isProduction: false,
      isFallback: true,
      demographic: normDemographic,
      capabilities: pocValidation.capabilities,
      warnings: [
        `Production 3D avatar asset pending for ${normDemographic}; utilizing verified technical POC mannequin fallback.`,
      ],
    }
  }

  // 3. Unavailable / Invalid
  return {
    url: null,
    assetType: AVATAR_ASSET_TYPE.INVALID,
    status: AVATAR_ASSET_STATUS.UNAVAILABLE,
    isProduction: false,
    isFallback: false,
    demographic: normDemographic,
    capabilities: null,
    warnings: [`No suitable 3D avatar asset found for demographic: ${normDemographic}`],
  }
}

/**
 * Maps raw dictionary morph target names to canonical application keys.
 *
 * @param {Object} rawDictionary - Three.js mesh.morphTargetDictionary
 * @param {Object} mappingConfig - CANONICAL_BODY_MORPH_MAP or CANONICAL_FACIAL_MORPH_MAP
 * @returns {Object} Mapped dictionary where keys are canonical IDs and values are index integers
 */
export function mapMorphTargetDictionary(rawDictionary = {}, mappingConfig = CANONICAL_BODY_MORPH_MAP) {
  if (!rawDictionary || typeof rawDictionary !== 'object') {
    return {}
  }

  const mapped = {}

  for (const [canonicalKey, candidateNames] of Object.entries(mappingConfig)) {
    // Check canonical key directly first
    if (rawDictionary[canonicalKey] !== undefined) {
      mapped[canonicalKey] = rawDictionary[canonicalKey]
      continue
    }

    // Check candidate aliases
    for (const candidate of candidateNames) {
      if (rawDictionary[candidate] !== undefined) {
        mapped[canonicalKey] = rawDictionary[candidate]
        break
      }
    }
  }

  return mapped
}

/**
 * Introspects a Three.js GLTF scene hierarchy to detect primary mesh,
 * mapped morph target capabilities, skin/eye materials, and attachment sockets.
 *
 * @param {THREE.Group|THREE.Scene} scene - Loaded Three.js scene
 * @param {string} [assetType=AVATAR_ASSET_TYPE.POC]
 * @returns {Object} Introspection report
 */
export function introspectAvatarScene(scene, assetType = AVATAR_ASSET_TYPE.POC) {
  const report = {
    primaryMorphMesh: null,
    bodyMorphMap: {},
    facialMorphMap: {},
    skinMaterials: [],
    eyeMaterials: [],
    headSocketNode: null,
    hasFacialSupport: false,
    hasHairSocket: false,
  }

  if (!scene || !scene.traverse) {
    return report
  }

  scene.traverse((node) => {
    // Sockets / attachment points
    if (node.name && (node.name === 'Head_Socket' || node.name === 'head_socket' || node.name === 'HeadSocket')) {
      report.headSocketNode = node
      report.hasHairSocket = true
    }

    if (node.isMesh) {
      // Morph Targets
      if (node.morphTargetDictionary && Object.keys(node.morphTargetDictionary).length > 0) {
        if (!report.primaryMorphMesh) {
          report.primaryMorphMesh = node
        }

        const bodyMapped = mapMorphTargetDictionary(node.morphTargetDictionary, CANONICAL_BODY_MORPH_MAP)
        const facialMapped = mapMorphTargetDictionary(node.morphTargetDictionary, CANONICAL_FACIAL_MORPH_MAP)

        report.bodyMorphMap = { ...report.bodyMorphMap, ...bodyMapped }
        report.facialMorphMap = { ...report.facialMorphMap, ...facialMapped }
      }

      // Materials (classify skin vs eyes vs garments)
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        mats.forEach((mat) => {
          const matName = (mat.name || '').toLowerCase()
          const meshName = (node.name || '').toLowerCase()

          const isEye =
            matName.includes('eye') ||
            matName.includes('iris') ||
            matName.includes('cornea') ||
            meshName.includes('eye')

          const isSkin =
            !isEye &&
            (matName.includes('skin') ||
              matName.includes('body') ||
              matName.includes('avatar') ||
              matName.includes('head') ||
              meshName.includes('body') ||
              meshName.includes('avatar') ||
              assetType === AVATAR_ASSET_TYPE.POC)

          if (isEye) {
            if (!report.eyeMaterials.includes(mat)) report.eyeMaterials.push(mat)
          } else if (isSkin) {
            if (!report.skinMaterials.includes(mat)) report.skinMaterials.push(mat)
          }
        })
      }
    }
  })

  report.hasFacialSupport = Object.keys(report.facialMorphMap).length > 0

  // Derive authoritative runtime capability matrix
  report.capabilities = {
    bodyMorphs: {
      chestScale: Boolean(report.bodyMorphMap.chestScale !== undefined),
      waistScale: Boolean(report.bodyMorphMap.waistScale !== undefined),
      hipScale: Boolean(report.bodyMorphMap.hipScale !== undefined),
      legLength: Boolean(report.bodyMorphMap.legLength !== undefined),
      torsoDepth: Boolean(report.bodyMorphMap.torsoDepth !== undefined),
    },
    facialMorphs: {
      faceWidth: Boolean(report.facialMorphMap.faceWidth !== undefined),
      jawWidth: Boolean(report.facialMorphMap.jawWidth !== undefined),
      chinLength: Boolean(report.facialMorphMap.chinLength !== undefined),
      noseWidth: Boolean(report.facialMorphMap.noseWidth !== undefined),
      eyeSpacing: Boolean(report.facialMorphMap.eyeSpacing !== undefined),
      cheekFullness: Boolean(report.facialMorphMap.cheekFullness !== undefined),
      lipFullness: Boolean(report.facialMorphMap.lipFullness !== undefined),
      eyeSize: Boolean(report.facialMorphMap.eyeSize !== undefined),
    },
    hair: Boolean(report.hasHairSocket),
    facialHair: Boolean(report.hasFacialSupport),
    skinMaterial: Boolean(report.skinMaterials.length > 0),
    eyeMaterial: Boolean(report.eyeMaterials.length > 0),
  }

  return report
}
